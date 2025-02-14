import { Router } from "express";
import { createRoom, helloWorld, joinRoom } from "./controller";

const router = Router();

// router.post("/create-room", createRoom);
router.get("/", helloWorld);

export default router;