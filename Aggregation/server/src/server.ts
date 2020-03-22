

import { Observable, of as observableOf, from as observableFrom, EMPTY, of } from 'rxjs';
import { tap, flatMap, map } from 'rxjs/operators';

// import { ormConnection } from './entities';
// import { RedisClient, createClient } from 'redis';
// import * as connectRedis from 'connect-redis';

import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as express from 'express';
import * as session from 'express-session';
import * as logger from 'morgan';
import * as passportType from "passport";
import * as mongoose from 'mongoose';
import * as cookieParser from 'cookie-parser';
import { KafkaService } from './kafka/services/kafka.service';
import { Tools } from './common/tools-service';

import { INestApplication, ValidationPipe } from '@nestjs/common';

export class Server {

    public app: INestApplication;

    constructor(app: INestApplication) {
        this.app = app;
    }

    public init(): Observable<INestApplication> {
        process.on('uncaughtException', (err) => {
            console.log('whoops! there was an error', err.stack);
        });
        return Tools.getSerialNumber().pipe(
            flatMap(() => this.initDependencies().pipe(
               // flatMap(() => this.initPassport().pipe(
                    flatMap(() => this.initDbMongoose().pipe(
                        map(() => this.app))
                    ))
                // ))
            ));
    }

    public initDbMongoose(): Observable<void> {
        Tools.loginfo('* start init mongoDB...');
        const db = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}`;

        return observableOf(
            mongoose.connect(db, {
                useMongoClient: true,
                promiseLibrary: global.Promise
            })
        ).pipe(map(
            (x: any) => {
                Tools.logSuccess('  => OK.');
                (mongoose as any).Promise = Promise;
            }, (err: any) => {
                Tools.logError(`  => KO! ${err}`);

                return err;
            }
        ));
    }

    public initDependencies(): Observable<void> {
        Tools.loginfo('* start init dependencies...');
        // const redisStore = connectRedis(session);
        // const redisClient: RedisClient = createClient();

        return observableOf(true).pipe(
            map(() => {
                this.app.use(bodyParser.urlencoded({ extended: true }));
                this.app.useGlobalPipes(new ValidationPipe());
                // this.app.use(bodyParser.urlencoded({extended: true}));
                // this.app.use(express.static('public'));
                // this.app.use(express.static('files'));
                // this.app.use(logger('dev'));
                // this.app.use(cookieParser());
                // this.app.use(bodyParser.urlencoded({ extended: true }));
                // this.app.use(bodyParser.json());
                // this.app.use(session({
                //     secret: String(process.env.JWT_SECRET),
                //     resave: true,
                //     saveUninitialized: true,
                //     // store: new redisStore({ host: '192.168.1.30', port: 6379, client: redisClient, ttl: 86400 }),
                //     cookie: {
                //         secure: false
                //     }
                // }));

                // redisClient.on('error', (err: any) => {
                //     this.loginfo('Redis error: ', err);
                // });
                Tools.logSuccess('  => OK');
            }));
    }

}