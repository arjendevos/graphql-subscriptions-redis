import { ApolloServer } from "apollo-server-express";

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { execute, subscribe } from "graphql";
import { SubscriptionServer } from "subscriptions-transport-ws";

import { schema } from "./modules";
import { context } from "./context";
import { formatError } from "./utils";

const port = process.env.PORT || 5000;

(async function () {
  const app = express();
  const httpServer = createServer(app);

  app.use(
    cors({
      origin: ["http://localhost:" + port, "https://studio.apollographql.com"],
      credentials: true,
    })
  );

  const apolloServer = new ApolloServer({
    schema,
    context,
    formatError,

    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],
  });

  async function findUser(authToken: any) {
    // find a user by auth token
    return { id: 1, name: "arjen" };
  }

  const subscriptionServer = SubscriptionServer.create(
    {
      // This is the `schema` we just created.
      schema,
      // These are imported from `graphql`.
      execute,
      subscribe,
      async onConnect(
        connectionParams: { Authorization: any },
        webSocket: any
      ) {
        if (connectionParams.Authorization) {
          const currentUser = await findUser(connectionParams.Authorization);
          return { currentUser };
        }
        throw new Error("Missing auth token!");
      },
    },
    {
      // This is the `httpServer` we created in a previous step.
      server: httpServer,
      // This `server` is the instance returned from `new ApolloServer`.
      path: apolloServer.graphqlPath,
    }
  );

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    cors: false,
  });

  httpServer.listen(port, () => {
    console.log(
      `Server ready at http://localhost:${port}${apolloServer.graphqlPath}`
    );
  });
})();
