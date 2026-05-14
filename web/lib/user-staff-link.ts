import {
  DynamoDBClient,
  TransactionCanceledException,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { credentialSubjectFromEmail } from "@/lib/credential-auth";
import { dynamoDbRegion, getEnv, userStaffLinkTableConfigured } from "@/lib/env";

const KIND_USER = "USER";
const KIND_STAFF = "STAFF";

function userPartitionKey(googleSub: string): string {
  return `USER#${googleSub.trim()}`;
}

function staffPartitionKey(staffId: string): string {
  return `STAFF#${staffId.trim()}`;
}

let docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!docClient) {
    const client = new DynamoDBClient({ region: dynamoDbRegion() });
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return docClient;
}

function tableName(): string {
  const t = getEnv().DYNAMODB_USER_STAFF_TABLE?.trim();
  if (!t) throw new Error("DYNAMODB_USER_STAFF_TABLE is not set");
  return t;
}

export async function getStaffIdByGoogleSub(
  googleSub: string
): Promise<string | null> {
  if (!userStaffLinkTableConfigured() || !googleSub.trim()) return null;
  const pk = userPartitionKey(googleSub);
  const out = await getDocClient().send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk },
      ProjectionExpression: "staffId",
    })
  );
  const sid = out.Item?.staffId;
  return typeof sid === "string" && sid.trim() ? sid.trim() : null;
}

/** メール／パスワードログイン（USER 行にハッシュがある場合のみ）。 */
export async function getCredentialUserForLogin(
  emailNormalized: string
): Promise<{
  subject: string;
  email: string;
  staffId: string;
  name?: string;
  passwordHashB64?: string;
  saltB64?: string;
} | null> {
  if (!userStaffLinkTableConfigured()) return null;
  const email = emailNormalized.trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  const subject = credentialSubjectFromEmail(email);
  const pk = userPartitionKey(subject);
  const out = await getDocClient().send(
    new GetCommand({ TableName: tableName(), Key: { pk } })
  );
  const it = out.Item;
  if (!it || it.kind !== KIND_USER) return null;
  const staffIdRaw = it.staffId;
  if (typeof staffIdRaw !== "string" || !staffIdRaw.trim()) return null;
  const hash =
    typeof it.passwordHashB64 === "string" ? it.passwordHashB64.trim() : "";
  const salt = typeof it.saltB64 === "string" ? it.saltB64.trim() : "";
  if (!hash || !salt) return null;
  const mail =
    typeof it.email === "string" && it.email.trim()
      ? it.email.trim().toLowerCase()
      : email;
  const display =
    typeof it.credentialDisplayName === "string" &&
    it.credentialDisplayName.trim()
      ? it.credentialDisplayName.trim()
      : undefined;
  const subStored =
    typeof it.googleSub === "string" && it.googleSub.trim()
      ? it.googleSub.trim()
      : subject;
  return {
    subject: subStored,
    email: mail,
    staffId: staffIdRaw.trim(),
    name: display,
    passwordHashB64: hash,
    saltB64: salt,
  };
}

export type RegisterStaffLinkResult =
  | { ok: true; idempotent?: boolean }
  | {
      ok: false;
      code:
        | "staff_already_linked"
        | "user_already_linked_staff"
        | "dynamo_not_configured"
        | "transact_failed";
    };

/**
 * 同一 Google `sub` × 同一 `staffId` の再送信は成功（idempotent）。
 */
export async function registerStaffLink(input: {
  googleSub: string;
  email: string | null | undefined;
  staffId: string;
  credentialAuth?: {
    passwordHashB64: string;
    saltB64: string;
    displayName?: string;
  };
}): Promise<RegisterStaffLinkResult> {
  if (!userStaffLinkTableConfigured()) {
    return { ok: false, code: "dynamo_not_configured" };
  }
  const googleSub = input.googleSub.trim();
  const staffId = input.staffId.trim();
  if (!googleSub || !staffId) {
    return { ok: false, code: "transact_failed" };
  }
  if (googleSub.startsWith("cred:") && !input.credentialAuth) {
    return { ok: false, code: "transact_failed" };
  }

  const userPk = userPartitionKey(googleSub);
  const staffPk = staffPartitionKey(staffId);
  const now = new Date().toISOString();

  const existingUser = await getDocClient().send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: userPk },
      ProjectionExpression: "staffId, googleSub",
    })
  );
  if (
    existingUser.Item?.staffId &&
    typeof existingUser.Item.staffId === "string"
  ) {
    const existingSid = existingUser.Item.staffId.trim();
    if (existingSid !== staffId) {
      return { ok: false, code: "user_already_linked_staff" };
    }
  }

  const existingStaff = await getDocClient().send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: staffPk },
      ProjectionExpression: "googleSub",
    })
  );
  if (
    existingStaff.Item?.googleSub &&
    typeof existingStaff.Item.googleSub === "string"
  ) {
    const owner = existingStaff.Item.googleSub.trim();
    if (owner !== googleSub) {
      return { ok: false, code: "staff_already_linked" };
    }
    return { ok: true, idempotent: true };
  }

  if (
    existingUser.Item?.staffId &&
    typeof existingUser.Item.staffId === "string" &&
    existingUser.Item.staffId.trim() === staffId
  ) {
    try {
      await getDocClient().send(
        new PutCommand({
          TableName: tableName(),
          Item: {
            pk: staffPk,
            kind: KIND_STAFF,
            googleSub,
            staffId,
            registeredAt: now,
          },
          ConditionExpression: "attribute_not_exists(pk)",
        })
      );
    } catch {
      const again = await getDocClient().send(
        new GetCommand({
          TableName: tableName(),
          Key: { pk: staffPk },
          ProjectionExpression: "googleSub",
        })
      );
      const o =
        typeof again.Item?.googleSub === "string"
          ? again.Item.googleSub.trim()
          : "";
      if (o && o !== googleSub) {
        return { ok: false, code: "staff_already_linked" };
      }
    }
    return { ok: true, idempotent: true };
  }

  const userPutItem =
    input.credentialAuth?.passwordHashB64 && input.credentialAuth.saltB64
      ? {
          pk: userPk,
          kind: KIND_USER,
          googleSub,
          staffId,
          email: input.email?.trim()
            ? input.email.trim().toLowerCase()
            : undefined,
          registeredAt: now,
          authKind: "credential",
          passwordHashB64: input.credentialAuth.passwordHashB64,
          saltB64: input.credentialAuth.saltB64,
          ...(input.credentialAuth.displayName?.trim()
            ? { credentialDisplayName: input.credentialAuth.displayName.trim() }
            : {}),
        }
      : {
          pk: userPk,
          kind: KIND_USER,
          googleSub,
          staffId,
          email: input.email?.trim() || undefined,
          registeredAt: now,
        };

  try {
    await getDocClient().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: tableName(),
              Item: userPutItem,
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
          {
            Put: {
              TableName: tableName(),
              Item: {
                pk: staffPk,
                kind: KIND_STAFF,
                googleSub,
                staffId,
                registeredAt: now,
              },
              ConditionExpression: "attribute_not_exists(pk)",
            },
          },
        ],
      })
    );
    return { ok: true };
  } catch (e) {
    if (e instanceof TransactionCanceledException) {
      return { ok: false, code: "staff_already_linked" };
    }
    throw e;
  }
}

export async function adminUnlinkStaff(staffId: string): Promise<void> {
  if (!userStaffLinkTableConfigured()) {
    throw new Error("DYNAMODB_USER_STAFF_TABLE is not set");
  }
  const sid = staffId.trim();
  if (!sid) throw new Error("staffId required");
  const staffPk = staffPartitionKey(sid);
  const staffOut = await getDocClient().send(
    new GetCommand({
      TableName: tableName(),
      Key: { pk: staffPk },
      ProjectionExpression: "googleSub",
    })
  );
  const googleSub =
    typeof staffOut.Item?.googleSub === "string"
      ? staffOut.Item.googleSub.trim()
      : "";
  if (!googleSub) {
    await getDocClient().send(
      new DeleteCommand({
        TableName: tableName(),
        Key: { pk: staffPk },
      })
    );
    return;
  }
  const userPk = userPartitionKey(googleSub);
  await getDocClient().send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: tableName(),
            Key: { pk: staffPk },
          },
        },
        {
          Delete: {
            TableName: tableName(),
            Key: { pk: userPk },
          },
        },
      ],
    })
  );
}
