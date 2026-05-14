/**
 * DYNAMODB_USER_STAFF_TABLE の全項目を削除する（テーブル自体は残す）。
 * 使い方: node scripts/clear-user-staff-table.mjs
 * 環境変数: DYNAMODB_USER_STAFF_TABLE, DYNAMODB_REGION（任意）
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

const table =
  process.env.DYNAMODB_USER_STAFF_TABLE?.trim() ||
  "form-site-user-staff-link";
const region =
  process.env.DYNAMODB_REGION?.trim() ||
  process.env.AWS_REGION?.trim() ||
  "ap-northeast-1";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});

let deleted = 0;
let startKey;

do {
  const scan = await doc.send(
    new ScanCommand({
      TableName: table,
      ProjectionExpression: "pk",
      ExclusiveStartKey: startKey,
    })
  );

  const pks = (scan.Items ?? [])
    .map((i) => i.pk)
    .filter((pk) => typeof pk === "string" && pk.length > 0);

  for (let i = 0; i < pks.length; i += 25) {
    const chunk = pks.slice(i, i + 25);
    await doc.send(
      new BatchWriteCommand({
        RequestItems: {
          [table]: chunk.map((pk) => ({
            DeleteRequest: { Key: { pk } },
          })),
        },
      })
    );
    deleted += chunk.length;
  }

  startKey = scan.LastEvaluatedKey;
} while (startKey);

console.log(`Deleted ${deleted} item(s) from ${table} (${region}).`);
