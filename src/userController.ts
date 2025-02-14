import { WebSocket } from "ws";
import { Room } from "../src/controller"

export class User 
{
    name: string = "";
    parentRoom!: Room;
    webSocket!: WebSocket;    
}
