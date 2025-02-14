import express, {Request, Response} from "express" 
import router from "./routes";
import { WebSocketServer, WebSocket } from "ws";
import { parseCommand, disconnectUser } from "./controller";


const app = express();
app.use(express.json());

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



app.use("/rooms", router);
app.use("/", router);

const webSocketServer = new WebSocketServer({ server });

webSocketServer.on("connection", (socket) => {
    console.log("New connection opened");

    socket.on("message", (message) => {
        console.log(`Player Command received`)
        parseCommand(socket, message.toString());
        socket.send("response");

    });

    socket.on("close", (message) => {
        console.log("Close Received");
        disconnectUser(socket);
        console.log("User disconnected, connection closed");
    });
});
 


