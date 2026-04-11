import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contactMessagesTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/contact", async (req, res): Promise<void> => {
  const { name, email, message } = req.body;
  if (!name || !message) {
    res.status(400).json({ error: "name and message are required" });
    return;
  }

  await db.insert(contactMessagesTable).values({ name, email, message });
  res.json({ success: true });
});

export default router;
