import WebSocket, { MessageEvent, ErrorEvent } from "ws";
import { JoinGameRequest, GameRequest, StartRoundRequest, SetBigBlindAmountRequest } from "./controller";


class WebSocketResult {
    constructor(public success: boolean) { };
}


export class TestHelper {

    private players: Player[] = [];

    private actions: Action[] = [];

    private addPlayer(playerName: string, gameName: string): Player {
        let player = new Player(gameName, playerName);
        this.players.push(player);
        return player;
    }

    private addGameRequest(player: Player, gameRequest: GameRequest, expectedResult: string) {
        let action: Action = new Action(player, ActionType.sendRequest, gameRequest, expectedResult);
        this.actions.push(action);
    }

    private addJoinRequest(player: Player) {
        let action: Action = new Action(player, ActionType.join);
        this.actions.push(action);
    }

    private addDisconnectRequest(player: Player) {
        let action: Action = new Action(player, ActionType.disconnect);
        this.actions.push(action);
    }

    public async RunTests() {
        await this.CreateTestScript();
        await this.ExecuteActions();
    }

    private async ExecuteActions() {
        for(const action of this.actions){
            await action.execute();
            console.log(action.toString());
        }
    }

    private async CreateTestScript() {
        let gameMaster = this.addPlayer("GameMaster", "G1");
        let leo = this.addPlayer("Leo", "G1");
        let knogga = this.addPlayer("Knogga", "G1");
        let louis = this.addPlayer("Louis", "G1");

        this.addJoinRequest(gameMaster);
        this.addJoinRequest(leo);
        this.addJoinRequest(knogga);
        this.addJoinRequest(louis);

        let setBigBlindRequest: SetBigBlindAmountRequest = new SetBigBlindAmountRequest();
        setBigBlindRequest.operation = "setBigBlind";
        setBigBlindRequest.amount = 300;
        this.addGameRequest(gameMaster, setBigBlindRequest, "success");

        let startGameRequest: StartRoundRequest = new StartRoundRequest();
        startGameRequest.operation = "startGame";
        this.addGameRequest(leo, startGameRequest, "failed");

        this.addGameRequest(gameMaster, startGameRequest, "success");
    }

}

enum ActionType {
    join = "join",
    sendRequest = "sendRequest",
    disconnect = "disconnect"
}

class Action {
    constructor(
        public player: Player,
        public actionType: ActionType,
        public request?: GameRequest,
        public expectedResult?: string) { };

    private actionSuccessful: boolean = false;

    public async execute(): Promise<boolean> {
        try{
            
            switch (this.actionType) {
                case ActionType.join:
                    this.actionSuccessful = (await this.player.join()).success;
                    break;
    
                case ActionType.sendRequest:
                    this.actionSuccessful = await this.executeActionWrapper();
                    break;
    
                case ActionType.disconnect:
                    this.actionSuccessful = this.player.close();
                    break;
            }
        } catch(error) {
            this.actionSuccessful = false;
        }  

        return this.actionSuccessful;

    }

    toString(): string {
        return `Action: ${this.request?.operation}, Player: ${this.player.playerName}, ExpectedResult: ${this.expectedResult} Evaluation: ${this.actionSuccessful}`;
    }

    private async executeActionWrapper(): Promise<boolean> {
        if (this.request === undefined || this.expectedResult === undefined) {
            return false;
        }

        let requestResult = await this.player.sendRequest(this.request, this.expectedResult);
        return requestResult.success;
    }

}

class Player {
    private socket?: WebSocket;

    constructor(
        public gameName: string,
        public playerName: string
    ) { };

    public async join(): Promise<WebSocketResult> {

        this.socket = new WebSocket("ws://localhost:5000");

        let joinRequest: JoinGameRequest = new JoinGameRequest();
        joinRequest.operation = "joinGame";
        joinRequest.gameName = this.gameName;
        joinRequest.userName = this.playerName;

        let result = await this.sendRequest(joinRequest, "joinGame: success");

        return result;
    }

    private async waitForSocketConnection(): Promise<void> {
        const maxAttempts = 10; // Maximum number of attempts
        const intervalTime = 200; // Interval time in milliseconds
    
        return new Promise((resolve, reject) => {
            let attempt = 0;
    
            const interval = setInterval(() => {
                if (this.socket?.readyState === WebSocket.OPEN) {
                    clearInterval(interval);
                    resolve();
                } else {
                    attempt++;
                    if (attempt >= maxAttempts) {
                        clearInterval(interval);
                        reject(new Error('WebSocket connection failed to open.'));
                    }
                }
            }, intervalTime);
        });
    }

    
    
    public async sendRequest(request: GameRequest, expectedResult: string): Promise<WebSocketResult> {
        await this.waitForSocketConnection();
        
        return new Promise((resolve, reject) => {
            
            this.socket?.send(JSON.stringify(request));
            
            const handleMessage = (event: MessageEvent) => {
                
                resolve(new WebSocketResult(event.data.toString().includes(expectedResult)));
                this.socket?.removeEventListener('message', handleMessage);
            }
            
            const handleError = (event: ErrorEvent) => {
                reject(new WebSocketResult(false));
                this.socket?.removeEventListener('error', handleError);
            }
            
            this.socket?.addEventListener('message', handleMessage);
            this.socket?.addEventListener('error', handleError);
            
        });
    }


    public close(): boolean {
        if (this.socket === undefined) {
            return true;
        }
    
        this.socket.close();
    
        return true;
    }
}