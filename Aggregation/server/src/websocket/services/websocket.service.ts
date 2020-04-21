import * as WebSocket from 'ws';
import * as http from "http";
import { map, tap, mergeMap, retryWhen, catchError } from 'rxjs/operators';
import { of as observableOf, from as observableFrom, Observable, of, observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { Tools } from '../../common/tools-service';
import { KafkaService } from '../../kafka/services/kafka.service';
import { genericRetryStrategy } from '../../common/generic-retry-strategy';
import { v1 } from 'uuid';
import { IWSMessage, ACTION_TYPE, ELEMENT_TYPE } from './interfaces/ws.message.interfaces';
import { TYPE_MODULE } from '../../manager/interfaces/module.interfaces';

interface ExtWebSocket extends WebSocket {
    isAlive: boolean;
}

export class Message {
    constructor(
        public content: string,
        public isBroadcast = false,
        public sender: { id: string }
    ) { }
}

interface IWebSocketEvent {
    data: WebSocket.Data;
    type: string;
    target: WebSocket;
}

interface IWebSocketError {
    error: any;
    message: string;
    type: string;
    target: WebSocket;
}

export class WebSocketService {

    public static wss: WebSocket.Server;

    public static sendMessage(clientId: string, content: string, exlude: Array<string> = []): void {
        if (WebSocketService.wss && WebSocketService.wss.clients) {
            const clientArray = [...WebSocketService.wss.clients];
            const clients = clientArray.filter((x: any) => exlude[0] !== x.protocol);
            clients.forEach(client => {
                const message = JSON.stringify(new Message(content, false, undefined));
                client.send(message);
            });
        }
    }



    public static syncClients(typeAction: ACTION_TYPE, target: ELEMENT_TYPE, entity: any, request: any): void {
        const messageToBuild = {
            typeAction: typeAction,
            target: target,
            date: new Date(),
            data: [entity]
        };

        const exclude = request && request.headers && request.headers.authorization && request.headers.authorization.split(" ")[1] ? [request.headers.authorization.split(" ")[1]] : [];

        const message = JSON.stringify(messageToBuild);
        WebSocketService.sendMessage('', message, exclude);
    }

    constructor(serverInstance: http.Server) {
        WebSocketService.wss = new WebSocket.Server({
            server: serverInstance, verifyClient(info, cb): void {
                const token = info.req.headers['sec-websocket-protocol'] as string;
                if (!token) {
                    cb(false, 401, 'Unauthorized');
                } else {
                    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
                        if (err) {
                            cb(false, 401, 'Unauthorized');
                        } else {
                            (info.req as any).user = decoded;
                            cb(true);
                        }
                    });
                }
            }
        });

    }

    public init(): Observable<WebSocket.Server> {
        return this.initDependencies().pipe(
            map(() => WebSocketService.wss));
    }
    public createMessage(content: string, isBroadcast = false, sender?: any): string {
        return JSON.stringify(new Message(content, isBroadcast, sender));
    }
    public initDependencies(): Observable<void> {
        Tools.loginfo('* start init websocket...');

        return observableOf(true).pipe(
            map(() => {
                Tools.logSuccess('  => OK.');
                const wss = WebSocketService.wss;
                WebSocketService.wss.on('connection', (ws: WebSocket) => {
                    const extWs = ws as ExtWebSocket;

                    jwt.verify(extWs.protocol, '123456789', (err, decoded) => {
                        if (err) {
                            console.log('error connection websocket');
                        } else {
                            (extWs as any).userInfo = decoded;
                        }
                    });


                    extWs.isAlive = true;
                    ws.on('pong', () => { extWs.isAlive = true; });
                    ws.onmessage = (event: IWebSocketEvent) => {
                        this.onMessage(event);
                    };
                    ws.onclose = (event: any) => {

                        const t = 2;
                    };
                    ws.onerror = (e: IWebSocketError) => { Tools.logWarn(`Client disconnected - reason: ${e.error}`); };
                    ws.send(this.createMessage('Connected to the WebSocket server'));
                    // setInterval(() => {
                    //     const messageToSend = JSON.stringify(this.testAddModule());
                    //     ws.send(this.createMessage(messageToSend));
                    // }, 10000);

                });
                this.stayConnected();
            }));
    }
    public stayConnected(): void {
        setInterval(() => {
            WebSocketService.wss.clients.forEach((ws: WebSocket) => {
                const extWs = ws as ExtWebSocket;

                jwt.verify(ws.protocol, '123456789', (err, decoded) => {
                    if (err || !extWs.isAlive) {
                        ws.close(1000, 'token expires');

                        return;
                    }
                    extWs.isAlive = false;
                    ws.ping(undefined, undefined);
                });

            });
        }, 10000);
    }

    public onMessage(event: IWebSocketEvent): any {
        const message = JSON.parse(event.data as string) as Message;
        setTimeout(() => {
            if (message.isBroadcast) {
                WebSocketService.wss.clients
                    .forEach(client => {
                        if (client !== event.target) {
                            client.send(this.createMessage(message.content, true, message.sender));
                        }
                    });
            }
            //event.target.send(this.createMessage(`You sent -> ${message.content}`, message.isBroadcast));
            this.test(event);
        }, 1000);
    }

    public test(event: any): void {
        const message = JSON.parse(event.data) as Message;
        let dataExample = {
            messageId: v1(),
            entity: 'Account', type: 'UPDATE',
            data: { account_id: 'server_3', name: 'name12', description: 'description1234' }
        };
        if (message.content === 'filter1') {
            dataExample = {
                messageId: v1(),
                entity: 'Account1', type: 'UPDATE',
                data: { account_id: 'server_3', name: 'name12', description: 'description1234' }
            };
        }
        const success = { source: 'OK', module: "string", value: "string", date: new Date() };
        const fail = { source: 'FAIL', module: "string", value: "string", date: new Date() };
        // const dataExample = {
        //     entity: 'Account', type: 'UPDATE',
        //     data: { account_id: 'server_3', name: 'name12', description: 'description1234' }
        // };
        const payloads = [
            {
                topic: 'box_action',
                messages: JSON.stringify(dataExample), key: 'box_action.server_1'
            }
        ];
        KafkaService.instance.sendMessage(payloads, true).pipe(mergeMap((checkResponse: any) =>

            of(false).pipe(
                map(val => {

                    const responseArray = KafkaService.instance.arrayOfResponse;
                    if (responseArray.length > 0) {

                        for (let index = 0; index < responseArray.length; index++) {
                            const element = responseArray[index];
                            const result = JSON.parse(element.value);
                            if (result.offset === checkResponse.oin) {
                                responseArray.splice(index, 1);

                                return { status: 'OK', message: "process success!" };
                            }
                        }
                    }
                    throw { status: 'KO', message: "process timeOut!" };
                }),
                retryWhen(genericRetryStrategy({
                    durationBeforeRetry: 200,
                    maxRetryAttempts: 40
                })), catchError((error: any) => {
                    console.log(JSON.stringify(error));

                    return error;
                }))
        )).subscribe((x: any) => {
            if (x) {
                //WebSocketService.sendMessage('server_1', JSON.stringify(x));
                // this.sendSuccess(res, x);
                event.target.send(this.createMessage(`response -> ${JSON.stringify(x)}`, false));
            }
        },
            (e: any) => {
                // this.sendSuccess(res, JSON.stringify(e));
                event.target.send(this.createMessage(`response -> ${JSON.stringify(e)}`, false));
            });
    }


    public testAddModule(): IWSMessage {
        return {
            typeAction: ACTION_TYPE.ADD,
            target: ELEMENT_TYPE.MODULE,
            date: new Date(),
            data: [{ id: v1(), name: 'module_' + v1(), type: TYPE_MODULE.RELAY, value: 'ON', transceiverId: 'server_1', groupViewId: ['server_1'] }] // aouter transceiverId + groupView
        };
        // return {
        //     typeAction: ACTION_TYPE.DELETE,
        //     target: ELEMENT_TYPE.MODULE,
        //     date: new Date(),
        //     data: [{ id: 'server_1'}]
        // };
    }

}