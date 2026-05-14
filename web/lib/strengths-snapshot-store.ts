/**
 * DynamoDB テーブル: パーティションキー `staffId` (S)、ソートキー `sk` (S)。
 * 全期間レポートは `sk` = STRENGTHS#ALL。属性 `payload` に JSON 文字列。
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  dynamoDbRegion,
  getEnv,
  strengthsSnapshotTableConfigured,
} from "@/lib/env";
import type { StrengthsSnapshotPublic } from "@/lib/strengths-analysis-schema";
import { STRENGTHS_SNAPSHOT_SORT_KEY } from "@/lib/strengths-data-scope";

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

export async function getStrengthsSnapshotFromStore(
  staffId: string
): Promise<StrengthsSnapshotPublic | null> {
  if (!strengthsSnapshotTableConfigured()) return null;
  const sid = staffId.trim();
  if (!sid) return null;
  try {
    const out = await getDocClient().send(
      new GetCommand({
        TableName: getEnv().DYNAMODB_STRENGTHS_SNAPSHOT_TABLE!.trim(),
        Key: {
          staffId: sid,
          sk: STRENGTHS_SNAPSHOT_SORT_KEY,
        },
      })
    );
    const raw = out.Item?.payload;
    if (typeof raw !== "string" || !raw.trim()) return null;
    const parsed = JSON.parse(raw) as StrengthsSnapshotPublic;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.sourceFingerprint === "string"
    ) {
      return parsed;
    }
    return null;
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "ResourceNotFoundException") {
      console.error("[strengths-snapshot] DynamoDB table not found");
      return null;
    }
    throw e;
  }
}

export async function putStrengthsSnapshotToStore(
  staffId: string,
  payload: StrengthsSnapshotPublic
): Promise<void> {
  if (!strengthsSnapshotTableConfigured()) return;
  const sid = staffId.trim();
  if (!sid) return;
  await getDocClient().send(
    new PutCommand({
      TableName: getEnv().DYNAMODB_STRENGTHS_SNAPSHOT_TABLE!.trim(),
      Item: {
        staffId: sid,
        sk: STRENGTHS_SNAPSHOT_SORT_KEY,
        reportMonth: payload.reportMonth,
        sourceFingerprint: payload.sourceFingerprint,
        generatedAt: payload.generatedAt,
        payload: JSON.stringify(payload),
      },
    })
  );
}
