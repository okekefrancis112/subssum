import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import fileUpload from 'express-fileupload';
import ResponseHandler from './util/response-handler';
import Logger from './util/logger';
import { Namespaces } from './constants/namespace.constant';
import { IUserDocument } from './interfaces/user.interface';
import { IAdminUserDocument } from './interfaces/admin-user.interface';
import { HTTP_CODES } from './constants/app_defaults.constant';

export interface ExpressRequest extends Request {
  user?: IUserDocument;
  admin_user?: IAdminUserDocument;
}

export interface ExpressResponse extends Response {
  header: any;
  attachment: any;
}

export const createApp = (name = 'Keble', bindRoutes: (app: Express) => void): Express => {
  const app = express();
  const logger = new Logger('general', Namespaces.SERVER);

  app.use(cors());

  /** Log the request */
  app.use((req: Request, res: Response, next: NextFunction) => {
    /** Log the req */
    logger.info(`METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`);

    res.on('finish', () => {
      /** Log the res */
      logger.info(
        `METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`
      );
    });

    next();
  });

  app.set('trust proxy', true);
  app.set('views', path.join(__dirname, 'views'));
  // app.set('view engine', 'pug');

  app.set('view engine', 'handlebars');

  app.use(express.json({ limit: '5mb' }));
  app.use(fileUpload());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.static(__dirname));
  app.disable('x-powered-by');

  bindRoutes(app);

  app.get('/', async (req: Request, res: Response) => {
    return ResponseHandler.sendSuccessResponse({
      res,
      message: `Welcome to ${name}`,
    });
  });

  app.get('/files/csv/:file', (req: Request, res: Response) => {
    try {
      const directory = path.resolve(__dirname, '../files/csv');
      const filepath = path.join(directory, req.params.file);

      fs.createReadStream(filepath).pipe(res);
    } catch (e: any) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
        error: e,
      });
    }
  });

  app.get('/files/pdfs/:file', (req: Request, res: Response) => {
    try {
      const directory = path.resolve(__dirname, '../files/pdfs');
      const filepath = path.join(directory, req.params.file);

      fs.createReadStream(filepath).pipe(res);
    } catch (e: any) {
      return ResponseHandler.sendErrorResponse({
        res,
        code: HTTP_CODES.INTERNAL_SERVER_ERROR,
        error: e,
      });
    }
  });

  /**
   *
   * 404 - Not Found Error Handler
   *
   */
  app.all('*', (req, res: Response) => {
    logger.error(`Requested route not found | PATH: [${req.url}]`);
    return ResponseHandler.sendErrorResponse({
      res,
      code: HTTP_CODES.NOT_FOUND,
      error: 'Requested route not found',
    });
  });

  return app;
};
