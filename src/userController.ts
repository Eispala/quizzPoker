import { WebSocket } from "ws";
import { Game as Game } from "../src/gameController"

export enum UserType {
    GameMaster = "GameMaster",
    NormalPlayer = "NormalPlayer",
    SmallBlind = "SmallBlind",
    BigBlind = "BigBlind"

}

export class User {
    name: string;
    Game: Game;
    webSocket: WebSocket;
    userType: UserType;
    answer!: number;
    currentBet!: number;

    turnOrderNumber: number = 0;

    constructor(Name: string, Game: Game, WebSocket: WebSocket, UserRole: UserType) {
        this.name = Name;
        this.Game = Game;
        this.webSocket = WebSocket;
        this.userType = UserRole;
    }


}

