import { WebSocket } from "ws";
import { Room } from "../src/gameController"

export enum UserType {
    GameMaster,
    NormalPlayer,
    SmallBlind,
    BigBlind

}

export class User {
    name: string;
    parentRoom: Room;
    webSocket: WebSocket;
    userType: UserType;
    answer!: number;
    currentBet!: number;

    turnOrderNumber: number = 0;

    constructor(Name: string, ParentRoom: Room, WebSocket: WebSocket, UserRole: UserType) {
        this.name = Name;
        this.parentRoom = ParentRoom;
        this.webSocket = WebSocket;
        this.userType = UserRole;
    }


}

