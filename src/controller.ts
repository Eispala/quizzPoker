import { Request, Response } from "express";
import { User, UserType } from "../src/userController"
import { WebSocket } from "ws";

import { Game } from "../src/gameController"

const socketUserMap: Map<WebSocket, User> = new Map();

export class GameRequest {
    operation!: string;
}

export class JoinGameRequest extends GameRequest {
    gameName!: string;
    userName!: string;
}

export class SetBigBlindAmountRequest extends GameRequest {
    amount!: number;
}

export class StartRoundRequest extends GameRequest {
}


let games: Map<string, Game> = new Map();


export function parseCommand(socket: WebSocket, message: string) {
    console.log(`Parsing command: ${message}`);

    let request: GameRequest = JSON.parse(message);

    let user: User | undefined;

    if (socketUserMap.has(socket)) {
        user = socketUserMap.get(socket);
    }

    try {
        switch (request.operation) {
            case "joinGame":
                console.log("Parsing join-reqeust");
                let joinGameRequest: JoinGameRequest = JSON.parse(message);
                let createdGame: Game | undefined = createGameWrapper(socket, joinGameRequest);
                if (createdGame === undefined) {
                    console.log("Game was not created");
                    socket.send("joinGame: failed");
                    return;
                }

                console.log(`Joining game`);
                let joinedUser: User | undefined = joinGame(joinGameRequest, socket, createdGame);

                if (joinedUser === undefined) {
                    console.log("User was not joined");
                    socket.send("joinGame: failed");
                    return;
                }


                socketUserMap.set(socket, joinedUser);
                socket.send("joinGame: success");

                break;

            case "startGame":
                if (user === undefined) {
                    console.log(`User found for socket, but user is undefined?`);
                    socket.send("startGame: failed");
                    return;
                }

                if (user.userType !== UserType.GameMaster) {
                    console.log(`User ${user.name} is not a gameMaster`);
                    socket.send("startGame: failed");
                    return;
                }

                if (user.Game === undefined) {
                    console.log(`Parent game of User ${user.name} is undefined`);
                    socket.send("startGame: failed");
                    return;
                }

                let game: Game | undefined = user.Game;

                console.log(`Admin ${user.name} started the game in game (GameId: ${game.id})`);

                game.StartRound();

                socket.send("startGame: successful");
                break;

            case "setBigBlind":
                let gameOfUser: Game | undefined = getGameOfUser(socket);
                if (gameOfUser === undefined) {
                    console.log(`Game of socket not found`);
                    socket.send("setBigBlind: failed");
                    return;
                }

                let setBigBlindRequest: SetBigBlindAmountRequest | undefined = JSON.parse(message);

                if (setBigBlindRequest === undefined) {
                    console.log(`BigBlindRequest could not be parsed`);
                    socket.send("setBigBlind: failed");
                    return;
                }

                if (user === undefined) {
                    console.log(`User is undefined`);
                    socket.send("setBigBlind: failed");
                    return;
                }

                if(gameOfUser.SetBigBlindAmount(user, setBigBlindRequest.amount)){
                    console.log(`BigBlind / SmallBlind set, Values: BigBlind: ${gameOfUser.bigBlind}, SmallBlind: ${gameOfUser.smallBlind}`);
                }
                socket.send("setBigBlind: success");

                break;

            default:
                console.log("request could not be parsed");
                break;
        }
    } catch (exception) {
        socket.send("error");
        console.log(`error, request: ${JSON.stringify(request)}`);
        console.log(`${exception}`);
    }

    console.log("-----------------------------------");
}

function getGameOfUser(socket: WebSocket): Game | undefined {
    if (!socketUserMap.has(socket)) {
        return;
    }

    return socketUserMap.get(socket)?.Game;
}

function joinDummyUser(game: Game, userName: string, socket: WebSocket) {


    let joinGameRequest: JoinGameRequest = new JoinGameRequest();
    joinGameRequest.gameName = game.id;
    joinGameRequest.userName = userName;
    joinGameRequest.operation = "joinGame";

    let joinedUser: User | undefined = joinGame(joinGameRequest, socket, game);

    if (joinedUser === undefined) {
        console.log("User was not joined");
        return;

    }

    console.log(`Game status: ${JSON.stringify(game)}`);

    socketUserMap.set(socket, joinedUser);
}

function closeGameIfNecessary(socket: WebSocket): Game | undefined {
    if (socketUserMap.has(socket)) {
        let socketUserMapEntry = socketUserMap.get(socket);
        if (socketUserMapEntry === undefined) {
            return undefined;
        }

        if (socketUserMapEntry.Game.users.size - 1 <= 0) {
            let deletedGameName: string = socketUserMapEntry.Game.id;
            games.delete(socketUserMapEntry.Game.id);
            console.log(`Deleted Game: ${deletedGameName}`);
            return undefined;
        }
        else {
            socketUserMapEntry.Game.users.delete(socketUserMapEntry.name);
            console.log(`User ${socketUserMapEntry.name} removed from game ${socketUserMapEntry.Game.id}`);
            return socketUserMapEntry.Game;
        }
    }

    return undefined;
}

function removeSocketFromBuffer(socket: WebSocket) {
    console.log(`Removing socket from Buffer`);
    if (socketUserMap.has(socket)) {
        socketUserMap.delete(socket);
        console.log(`Socket was removed`);
    }
}

export function disconnectUser(socket: WebSocket) {
    let gameClosed = closeGameIfNecessary(socket);

    if (gameClosed != undefined) {
        promoteNewAdminIfNecessary(gameClosed);
    }

    removeSocketFromBuffer(socket);

}

function promoteNewAdminIfNecessary(game: Game) {

    if (game.users.size <= 0) {
        return;
    }

    let gameHasAdmin: boolean = [...game.users.values()].some(user => user.userType === UserType.GameMaster);

    if (gameHasAdmin) {
        return;
    }

    let firstUser: [string, User] | undefined = game.users.entries().next().value;

    if (firstUser === undefined) {
        return;
    }

    let [userKey, user] = firstUser;

    user.userType = UserType.GameMaster;

    console.log(`Promoted User ${user.name} to GameMaster`);

}

function getExistingGame(gameName: string): Game | undefined {
    if (games.has(gameName)) {
        return games.get(gameName);
    }
    return undefined;
}

function createGameWrapper(socket: WebSocket, joinGameRequest: JoinGameRequest): Game | undefined {
    let gameNameIsAllowed = gameNameAllowed(joinGameRequest.gameName);
    let existingGame: Game | undefined = getExistingGame(joinGameRequest.gameName);
    if (existingGame === undefined) {
        if (!gameNameIsAllowed) {
            //socket.send(`GameName ${joinGameRequest.gameName} is not allowed`);
            return undefined;

        }

        let createdGame = createGame(joinGameRequest.gameName);
        console.log(`Created Game: ${JSON.stringify(createdGame)}`);
        //socket.send(`${JSON.stringify(createdGame)}`);

        return createdGame;

    }
    else {
        return existingGame;
    }
}

function gameNameAllowed(gameName: string): boolean {

    switch (gameName) {
        case "":
            return false;

    }

    return true;
}

export function createGame(gameName: string): Game {
    console.log(`Creating Game: ${gameName}`)
    let newGame: Game = new Game();
    newGame.id = gameName;

    games.set(newGame.id, newGame);

    return newGame;

}


function gameExists(gameName: string): boolean {
    if (games.has(gameName)) {

        return true;
    }

    return false;

}

export function joinGame(gameRequest: JoinGameRequest, socket: WebSocket, joinedGame: Game): User | undefined {
    if (gameRequest.userName === undefined) {
        console.log("No Username provided");
        return;
    }

    if (joinedGame.users.has(gameRequest.userName)) {
        console.log(`User ${gameRequest.userName} already is in the Game`);
        return;
    }

    let userType: UserType;
    if (joinedGame.users.size === 0) {
        userType = UserType.GameMaster;
    }
    else {
        userType = UserType.NormalPlayer;
    }

    let user: User = new User(gameRequest.userName, joinedGame, socket, userType);

    joinedGame.users.set(user.name, user);
    console.log(`Added User ${user.name} to Game ${joinedGame.id}, userRole: ${user.userType}`);
    return user;
}

export function helloWorld(request: Request, response: Response) {
    response.json({ message: "Hello World" });
}