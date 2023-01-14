import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import helmet from 'helmet';
import express, { Request, Response, NextFunction } from 'express';

import 'express-async-errors';

import BaseRouter from './routes/api';
import logger from 'jet-logger';
import EnvVars from '@src/declarations/major/EnvVars';
import HttpStatusCodes from '@src/declarations/major/HttpStatusCodes';
import { NodeEnvs } from '@src/declarations/enums';
import { RouteError } from '@src/declarations/classes';

import { apiDoc, initApiDocs, tNonNullable, tString } from 'swagger-typed-express-docs';
import swaggerUi from 'swagger-ui-express';
import { tList, tObject, tUnion } from 'swagger-typed-express-docs/dist/schemaBuilder';

// **** Init express **** //

const app = express();


// **** Set basic express settings **** //

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser(EnvVars.cookieProps.secret));

// Show routes called in console during development
if (EnvVars.nodeEnv === NodeEnvs.Dev) {
  app.use(morgan('dev'));
}

// Security
if (EnvVars.nodeEnv === NodeEnvs.Production) {
  app.use(helmet());
}


// **** Add API routes **** //

// Add APIs
app.use('/api', BaseRouter);

// Setup error handler
app.use((
  err: Error,
  _: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
) => {
  logger.err(err, true);
  let status = HttpStatusCodes.BAD_REQUEST;
  if (err instanceof RouteError) {
    status = err.status;
  }
  return res.status(status).json({ error: err.message });
});


// **** Serve front-end content **** //

// Set views directory (html)
const viewsDir = path.join(__dirname, 'views');
app.set('views', viewsDir);

// Set static directory (js and css).
const staticDir = path.join(__dirname, 'public');
app.use(express.static(staticDir));

// Nav to login pg by default
app.get('/', apiDoc({
  })((req: Request, res: Response) => {
    res.sendFile('login.html', {root: viewsDir});
  })
);

// Redirect to login if not logged in.
app.get('/users', (req: Request, res: Response) => {
  const jwt = req.signedCookies[EnvVars.cookieProps.key];
  if (!jwt) {
    res.redirect('/');
  } else {
    res.sendFile('users.html', {root: viewsDir});
  }
});

app.get(
  '/test', 
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


const swaggerJSON = initApiDocs(app, { info: { title: 'my application' }});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerJSON));
// **** Export default **** //

export default app;
