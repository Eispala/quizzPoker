import { Request, Response } from "express";
import { User, UserType } from "../src/userController"
import { WebSocket } from "ws";

enum RoundType {
    firstRound,
    normalRound,
    lastRound,
    none
}

export class Room {
    id: string = "";
    users: Map<string, User> = new Map();
    startingChips: number = 0;
    smallBlind: number = 0;
    bigBlind: number = 0;
    currentPrizePool: number = 0;
    currentRoundType: RoundType = RoundType.none;

    toJSON() {
        return {
            id: this.id,
            users: Object.fromEntries(
                [...this.users.entries()].map(([key, user]) => [user.name]))
        }
    }

    SetBigBlind(User: User, bigBlind: number) {
        if (!this.UserIsAdmin(User)) {
            return;
        }

        this.bigBlind = bigBlind;
        this.smallBlind = bigBlind / 2;
    }

    SetStartingChips(User: User, startingChips: number) {
        if (!this.UserIsAdmin(User)) {
            return;
        }

        this.startingChips = startingChips;
    }
    

    RandomizeTurnOrder(User: User) {
        if (!this.UserIsAdmin(User)) {
            return;
        }

        let turnOrder: number[] = this.generateRandomUniqueNumbers(this.users.size);

        let counter: number = 0;
        this.users.forEach((user: User) => {
            counter++;
            user.turnOrderNumber = turnOrder[counter];
        });

        counter = 0;
    }

    UserIsAdmin(User: User): boolean {
        if (User.userType === UserType.GameMaster) {
            return true;
        }

        return false;
    }

    private generateRandomUniqueNumbers(countOfNumbersToGenerate: number): number[] {
        let numbers = Array.from({ length: countOfNumbersToGenerate }, (_, index) => index);

        for (let counter = countOfNumbersToGenerate - 1; counter > 0; counter--) {
            let random: number = Math.floor(Math.random() * (counter + 1));

            [numbers[counter], numbers[random]] = [numbers[random], numbers[counter]];
        }

        return numbers;
    }
}

interface GameRequest {
    operation: string;
}

export class JoinRoomRequest extends Request {

    roomName!: string;
    userName!: string;
}

let rooms: Map<string, Room> = new Map();


export function roomExists(roomName: string): boolean {
    if (rooms.has(roomName)) {

        return true;
    }

    return false;

}

const socketUserMap: Map<WebSocket, User> = new Map();

export function parseCommand(socket: WebSocket, message: string) {
    console.log(`Parsing command: ${message}`);

    let request: GameRequest = JSON.parse(message);

    switch (request.operation) {
        case "join":
            console.log("Parsing join-reqeust");
            let joinRoomRequest: JoinRoomRequest = JSON.parse(message);
            let createdRoom: Room | undefined = createRoomWrapper(socket, joinRoomRequest);
            if (createdRoom === undefined) {
                console.log("Room was not created");
                return;
            }

            console.log(`Joining room`);
            let joinedUser: User | undefined = joinRoom(joinRoomRequest, socket, createdRoom);

            if (joinedUser === undefined) {
                console.log("User was not joined");
                return;
            }

            console.log(`Room status: ${JSON.stringify(createdRoom)}`);

            socketUserMap.set(socket, joinedUser);

            break;

        default:
            console.log("request could not be parsed");
            break;
    }
}

function closeRoomIfNecessary(socket: WebSocket): Room | undefined {
    if (socketUserMap.has(socket)) {
        let socketUserMapEntry = socketUserMap.get(socket);
        if (socketUserMapEntry === undefined) {
            return undefined;
        }

        if (socketUserMapEntry.parentRoom.users.size - 1 <= 0) {
            let deletedRoomName: string = socketUserMapEntry.parentRoom.id;
            rooms.delete(socketUserMapEntry.parentRoom.id);
            console.log(`Deleted Room: ${deletedRoomName}`);
            return undefined;
        }
        else {
            socketUserMapEntry.parentRoom.users.delete(socketUserMapEntry.name);
            console.log(`User ${socketUserMapEntry.name} removed from room ${socketUserMapEntry.parentRoom.id}`);
            return socketUserMapEntry.parentRoom;
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
    let roomClosed = closeRoomIfNecessary(socket);

    if (roomClosed != undefined) {
        promoteNewAdminIfNecessary(roomClosed);
    }

    removeSocketFromBuffer(socket);

}

function promoteNewAdminIfNecessary(room: Room) {

    if (room.users.size <= 0) {
        return;
    }

    let roomHasAdmin: boolean = [...room.users.values()].some(user => user.userType === UserType.GameMaster);

    if (roomHasAdmin) {
        return;
    }

    let firstUser: [string, User] | undefined = room.users.entries().next().value;

    if (firstUser === undefined) {
        return;
    }

    let [userKey, user] = firstUser;

    user.userType = UserType.GameMaster;

    console.log(`Promoted User ${user.name} to GameMaster`);

}

function getExistingRoom(roomName: string): Room | undefined {
    if (rooms.has(roomName)) {
        return rooms.get(roomName);
    }
    return undefined;
}

export function createRoomWrapper(socket: WebSocket, joinRoomRequest: JoinRoomRequest): Room | undefined {

    let roomNameIsAllowed = roomNameAllowed(joinRoomRequest.roomName);
    let existingRoom: Room | undefined = getExistingRoom(joinRoomRequest.roomName);
    if (existingRoom === undefined) {
        if (!roomNameIsAllowed) {
            socket.send(`RoomName ${joinRoomRequest.roomName} is not allowed`);
            return undefined;

        }

        let createdRoom = createRoom(joinRoomRequest.roomName);
        console.log(`Created Room: ${JSON.stringify(createdRoom)}`);
        socket.send(`${JSON.stringify(createdRoom)}`);

        return createdRoom;

    }
    else {
        return existingRoom;
    }
}

export function roomNameAllowed(roomName: string): boolean {

    switch (roomName) {
        case "":
            return false;

    }

    return true;
}

export function createRoom(roomName: string): Room {
    console.log(`Creating Room: ${roomName}`)
    let newRoom: Room = new Room();
    newRoom.id = roomName;

    rooms.set(newRoom.id, newRoom);

    return newRoom;

}

export function joinRoom(gameRequest: JoinRoomRequest, socket: WebSocket, joinedRoom: Room): User | undefined {
    if (gameRequest.userName === undefined) {
        console.log("No Username provided");
        return;
    }

    if (joinedRoom.users.has(gameRequest.userName)) {
        console.log(`User ${gameRequest.userName} already is in the room`);
        return;
    }

    let userType: UserType;
    if (joinedRoom.users.size === 0) {
        userType = UserType.GameMaster;
    }
    else {
        userType = UserType.Player;
    }

    let user: User = new User(gameRequest.userName, joinedRoom, socket, userType);

    joinedRoom.users.set(user.name, user);
    console.log(`Added User ${user.name} to room ${joinedRoom.id}, userRole: ${user.userType}`);
    return user;
}

export function helloWorld(request: Request, response: Response) {
    response.json({ message: "Hello World" });
}