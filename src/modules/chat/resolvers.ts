import {
  Chat,
  Maybe,
  Resolvers,
  ResolverTypeWrapper,
} from "../../graphql/types";
import { Context } from "../../context";
import { RedisPubSub } from "graphql-redis-subscriptions";

import Redis from "ioredis";
import { withFilter } from "graphql-subscriptions";

const options = {
  host: "localhost",
  port: 6379,
  retryStrategy: (times: number) => {
    // reconnect after
    return Math.min(times * 50, 2000);
  },
};

const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options),
});

const chats:
  | Maybe<Maybe<ResolverTypeWrapper<Chat>>[]>
  | PromiseLike<Maybe<Maybe<ResolverTypeWrapper<Chat>>[]>>
  | { id: number; message: string; receiverId: number; senderId: number }[] =
  [];

export const ChatResolvers: Resolvers<Context> = {
  Query: {
    messages: async (_parent, _args, _context) => {
      return chats;
    },
  },
  Mutation: {
    createMessage: async (_parent, args, _context) => {
      const chat = {
        id: chats.length + 1,
        message: args.message,
        receiverId: args.receiverId,
        senderId: args.senderId,
      };
      chats.push(chat);
      pubsub.publish("CHAT_SENDED", chat);
      return chat;
    },
  },
  Subscription: {
    onMessageCreated: {
      // subscribe: (_parent, args, _context, _info) => {
      //   print(args);
      //   return pubsub.asyncIterator(["CHAT_CREATED"]);
      // },
      subscribe: withFilter(
        (_parent, _args, _context, _info) =>
          pubsub.asyncIterator("CHAT_SENDED"),
        (payload, variables) => {
          print(variables);
          // Only send message to the one who is receiving it
          return payload.receiverId == variables.subscriberId;
        }
      ),
      resolve: async (chat: any) => {
        console.log(chat);
        return chat;
      },
    },
  },
};

const print = (val: any) => console.log(val);
