import { User, UserType } from "../src/userController";

export enum RoundType {
    firstRound = "firstRound",
    normalRound = "normalRound",
    lastRound = "lastRound",
    none = "none"
}


export class Game {
    id: string = "";
    users: Map<string, User> = new Map();
    startingChips: number = 0;
    smallBlind: number = 0;
    bigBlind: number = 0;
    currentPrizePool: number = 0;
    currentRoundType: RoundType = RoundType.none;
    playerCountWithoutGameMaster: number = 0;

    toJSON() {
        return {
            id: this.id,
            users: Object.fromEntries(
                [...this.users.entries()].map(([key, user]) => [user.name]))
        }
    }

    SetBigBlindAmount(User: User, bigBlind: number) {
        if (!this.UserIsAdmin(User)) {
            return;
        }

        this.bigBlind = bigBlind;
        this.smallBlind = bigBlind / 2;
    }

    SetStartingChipsAmount(User: User, startingChips: number) {
        if (!this.UserIsAdmin(User)) {
            return;
        }

        this.startingChips = startingChips;
    }

    RandomizeTurnOrder() {
        // if (!this.UserIsAdmin(User)) {
        //     return;
        // }

        //bei kleinen maps stoert das keinen
        let playerCount: number = Array.from(this.users.values()).filter(user => user.userType === UserType.NormalPlayer).length;
        this.playerCountWithoutGameMaster = playerCount;

        let turnOrder: number[] = this.generateRandomUniqueNumbers(playerCount);

        let counter: number = 0;
        this.users.forEach((user: User) => {
            if (user.userType != UserType.NormalPlayer) {
                return;
            }

            user.turnOrderNumber = turnOrder[counter];

            switch (user.turnOrderNumber) {
                case 0:
                    user.userType = UserType.SmallBlind;

                    break;
                case 1:
                    user.userType = UserType.BigBlind;
                    break;

                default:
                    user.userType = UserType.NormalPlayer;
                    break;
            }

            counter++;
        });

        counter = 0;

        this.NewHand_ShouldBeNewRoundMaybe();
    }

    NewHand_ShouldBeNewRoundMaybe() {
        this.users.forEach((user: User) => {
            if (user.userType != UserType.NormalPlayer) {
                return;
            }

            user.turnOrderNumber += 1;
            if (user.turnOrderNumber > this.playerCountWithoutGameMaster) {
                user.turnOrderNumber = 0;
            }

        })
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

    BigBlindIndex: number = 0;
    SmallBlindIndex: number = 0;

    private randomizeBigBlindPlayer() {
        this.BigBlindIndex = Math.floor(Math.random() * this.users.entries.length);
        this.SmallBlindIndex = this.BigBlindIndex - 1;

        if (this.SmallBlindIndex <= 0) {
            this.SmallBlindIndex = this.users.entries.length - 1;
        }



    }

    StartRound_ShouldBeNewHandMaybe() {
        this.currentRoundType = RoundType.firstRound;
        this.RandomizeTurnOrder();

    }



    private getNextPlayer() {
        switch (this.currentRoundType) {
            case RoundType.firstRound:

                break;

            case RoundType.normalRound:
                break;

            case RoundType.lastRound:
                break;

            case RoundType.none:
                break;
        }
    }
}