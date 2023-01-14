import { Router } from 'express';
import jetValidator from 'jet-validator';

import adminMw from './shared/adminMw';
import User from '@src/models/User';
import authRoutes from './auth-routes';
import userRoutes from './user-routes';

import { apiDoc, initApiDocs, tNonNullable, tString } from 'swagger-typed-express-docs';
import swaggerUi from 'swagger-ui-express';
import { tList, tObject, tUnion } from 'swagger-typed-express-docs/dist/schemaBuilder';
// **** Init **** //

const apiRouter = Router(),
  validate = jetValidator();


// **** Setup auth routes **** //

const authRouter = Router();

// Login user
authRouter.post(
  authRoutes.paths.login,
  validate('email', 'password'),
  authRoutes.login,
);

// Logout user
authRouter.get(authRoutes.paths.logout, authRoutes.logout);

// Add authRouter
apiRouter.use(authRoutes.paths.basePath, authRouter);


// **** Setup user routes **** //

const userRouter = Router();

// Get all users
userRouter.get(userRoutes.paths.get, userRoutes.getAll);

// Add one user
userRouter.post(
  userRoutes.paths.add,
  validate(['user', User.instanceOf]),
  userRoutes.add,
);

// Update one user
userRouter.put(
  userRoutes.paths.update,
  validate(['user', User.instanceOf]),
  userRoutes.update,
);

// Delete one user
userRouter.delete(
  userRoutes.paths.delete,
  validate(['id', 'number', 'params']),
  userRoutes.delete,
);

// Add userRouter
apiRouter.use(userRoutes.paths.basePath, adminMw, userRouter);

apiRouter.get(
  '/test2', 
  apiDoc({
    query: {
      name: tNonNullable(tString),
      header: tList(tNonNullable(tUnion(['a', 'b', 'c'] as const))),
    },
    body: {
      header: tList(tNonNullable(tUnion(['a', 'b', 'c'] as const))),
      message: tNonNullable(tString),
      footer: tString,
    },
    returns: tObject({
      data: tObject({
        nestedData: tUnion(['a', 'b', 'c'] as const),
      }),
    }),
  })((req, res) => {
    const body = req.body;
    const query = req.query;

    res.send({
      body,
      query,
    })
  })
);

// const swaggerJSON = initApiDocs(app, { info: { title: 'my application' }});

// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJSON));
// **** Export default **** //

export default apiRouter;
