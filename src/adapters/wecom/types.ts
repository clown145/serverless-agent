export type WecomAccessTokenResponse = {
  errcode?: number;
  errmsg?: string;
  access_token?: string;
  expires_in?: number;
};

export type WecomKfAccount = {
  open_kfid?: string;
  name?: string;
  avatar?: string;
};

export type WecomKfAccountListResponse = {
  errcode?: number;
  errmsg?: string;
  account_list?: WecomKfAccount[];
};

export type WecomKfContactWayResponse = {
  errcode?: number;
  errmsg?: string;
  url?: string;
};

export type WecomKfSyncMessage = {
  msgid?: string;
  msgtype?: string;
  open_kfid?: string;
  external_userid?: string;
  send_time?: number;
  text?: {
    content?: string;
  };
};

export type WecomKfSyncMessageResponse = {
  errcode?: number;
  errmsg?: string;
  next_cursor?: string;
  has_more?: number;
  msg_list?: WecomKfSyncMessage[];
};

export type WecomKfSendMessageResponse = {
  errcode?: number;
  errmsg?: string;
  msgid?: string;
};

export type WecomCallbackMessage = {
  ToUserName?: string;
  FromUserName?: string;
  CreateTime?: string;
  MsgType?: string;
  Event?: string;
  Token?: string;
  OpenKfId?: string;
  AgentID?: string;
  [key: string]: string | undefined;
};
