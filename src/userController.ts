import { WebSocket } from "ws";
import { Room } from "../src/controller"

export enum UserType{
    GameMaster = "GM",
    Player = "Player"
}

export class User 
{
    name: string;
    parentRoom: Room;
    webSocket: WebSocket;
    userType: UserType;

     constructor(Name: string, ParentRoom: Room, WebSocket: WebSocket, UserRole: UserType){
        this.name = Name;
        this.parentRoom = ParentRoom;
        this.webSocket = WebSocket;
        this.userType = UserRole;
    }
}

