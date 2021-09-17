import {
  VideoClient,
  Stream,
  Participant,
  ChatClient as SDKChatClient,
} from '@zoomus/instantsdk';

export type ZoomClient = typeof VideoClient;
export type MediaStream = typeof Stream;
export type Participant = Participant;
export type ChatClient = typeof SDKChatClient;
