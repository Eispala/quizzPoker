import { Router } from "express";
import { createGame, helloWorld, joinGame } from "./controller";

const router = Router();

// router.post("/create-room", createRoom);
router.get("/", helloWorld);

export default router;