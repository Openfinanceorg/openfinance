export type AccountDisconnectedMetadata = {
  type: "account_disconnected";
  connectionId: number;
  institutionName: string;
  institutionUrl: string | null;
  errorMessage?: string;
};

export type TransactionSyncMetadata = {
  type: "transaction_sync";
  connectionId: number;
  institutionName: string;
  institutionUrl: string | null;
  added: number;
  modified: number;
  removed: number;
};

export type NotificationMetadata =
  | AccountDisconnectedMetadata
  | TransactionSyncMetadata;

export interface ApiNotification {
  id: number;
  channel: string;
  title: string;
  metadata: NotificationMetadata;
  sentAt: string;
  readAt: string | null;
}

export interface GetNotificationsResponse {
  notifications: ApiNotification[];
}

export interface NotificationFilter {
  limit?: number;
  cursor?: string;
}
