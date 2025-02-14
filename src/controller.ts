import { Request, Response } from "express";
import { User } from "../src/userController"
import { WebSocket } from "ws";
import { Socket } from "dgram";

export class Room {
    id: string = "";
    users: Map<string, User> = new Map();

    toJSON() {
        return {
            id: this.id,
            users: Object.fromEntries(
                [...this.users.entries()].map(([key, user]) => [key, user.name]))
        }
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
            if(createdRoom === undefined)
            {
                console.log("Room was not created");
                return;
            }

            console.log(`Joining room`);
            let joinedUser: User | undefined = joinRoom(joinRoomRequest, socket, createdRoom);

            if(joinedUser === undefined)
            {
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

function closeRoomIfNecessary(socket: WebSocket)
{
    
    if(socketUserMap.has(socket))
    {
        let socketUserMapEntry = socketUserMap.get(socket);
        if(socketUserMapEntry === undefined)
        {
            return;
        }

        if(socketUserMapEntry.parentRoom.users.size - 1 <= 0)
        {
            let deletedRoomName: string = socketUserMapEntry.parentRoom.id;
            rooms.delete(socketUserMapEntry.parentRoom.id);
            console.log(`Deleted Room: ${deletedRoomName}`)
        }
        else{
            socketUserMapEntry.parentRoom.users.delete(socketUserMapEntry.name);
            console.log(`User ${socketUserMapEntry.name} removed from room ${socketUserMapEntry.parentRoom.id}`);
        }
    }
}

function removeSocketFromBuffer(socket: WebSocket)
{
    console.log(`Removing socket from Buffer`);
    if(socketUserMap.has(socket))
    {
        socketUserMap.delete(socket);
        console.log(`Socket was removed`);
    }
}

export function disconnectUser(socket: WebSocket)
{
    closeRoomIfNecessary(socket);
    removeSocketFromBuffer(socket);

}

function getExistingRoom(roomName: string): Room | undefined
{
    if(rooms.has(roomName))
    {
        return rooms.get(roomName);
    }
    return undefined;
}

export function createRoomWrapper(socket: WebSocket, joinRoomRequest:JoinRoomRequest): Room | undefined {

    let roomNameIsAllowed = roomNameAllowed(joinRoomRequest.roomName);
    let existingRoom: Room | undefined = getExistingRoom(joinRoomRequest.roomName);
    if(existingRoom === undefined)
    {
        if (!roomNameIsAllowed) {
            socket.send(`RoomName ${joinRoomRequest.roomName} is not allowed`);
            return undefined;
    
        }

        let createdRoom = createRoom(joinRoomRequest.roomName);
        console.log(`Created Room: ${JSON.stringify(createdRoom)}`);
        socket.send(`${JSON.stringify(createdRoom)}`);
    
        return createdRoom;

    }
    else
    { 
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

    let user: User = new User();
    user.name = gameRequest.userName;
    user.webSocket = socket;
    user.parentRoom = joinedRoom;
    joinedRoom.users.set(user.name, user);
    console.log(`Added User ${user.name} to room ${joinedRoom.id}`);
    return user;
}

export function helloWorld(request: Request, response: Response) {
response.json({ message: "Hello World" });
}