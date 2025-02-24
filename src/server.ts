import apiRoutes from './routes/api.js';
import bugsnagMiddleware from './middleware/bugsnag.js';
import cors from 'cors';
import { createApolloMiddleware } from './middleware/apolloServer.js';
import express from 'express';
import { fileURLToPath } from 'url';
import indexController from './controllers/indexController.js';
import morgan from 'morgan';
import openapiDocsController from './controllers/openapiDocsController.js';
import path from 'path';
import rateLimit from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

const limiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 10000, // limit each IP to 10000 requests per windowMs
});

export default async () => {
  const app = express();

  // Middleware stuff
  app.set('view engine', 'ejs');
  app.set('views', __dirname + '/views');
  if (bugsnagMiddleware) {
    app.use(bugsnagMiddleware.requestHandler);
  }

  app.use('/swagger', express.static(__dirname + '/swagger'));
  app.use('/js', express.static(__dirname + '/js'));
  app.use('/css', express.static(__dirname + '/css'));
  app.use('/public', express.static(__dirname + '/public'));
  app.use(morgan('short'));
  // Enable all CORS requests
  app.use(cors());

  app.use(limiter);

  console.log('Setting up Apollo GraphQL server');
  const apolloMiddleware = await createApolloMiddleware();
  await apolloMiddleware.start();
  apolloMiddleware.applyMiddleware({ app });

  // Register routes
  app.get('/', indexController);
  app.get('/docs', openapiDocsController);
  app.use('/api', apiRoutes);

  app.use(function(req: express.Request, res: express.Response) {
    res.status(404);

    // TODO: Add a fun 404 page
    // // respond with html page
    // if (req.accepts('html')) {
    //   res.render('404', { url: req.url });
    //   return;
    // }

    // default respond with json
    return res.send({ error: 'Not found' });
  });

  if (bugsnagMiddleware?.errorHandler) {
    app.use(bugsnagMiddleware.errorHandler);
  }
  return app;
};
