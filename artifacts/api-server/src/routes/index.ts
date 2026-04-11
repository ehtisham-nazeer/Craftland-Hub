import { Router, type IRouter } from "express";
import healthRouter from "./health";
import mapsRouter from "./maps";
import creatorsRouter from "./creators";
import submissionsRouter from "./submissions";
import usersRouter from "./users";
import notificationsRouter from "./notifications";
import reportsRouter from "./reports";
import commentsRouter from "./comments";
import analyticsRouter from "./analytics";
import contactRouter from "./contact";
import pushRouter from "./push";
import storageRouter from "./storage";
import creatorApplicationsRouter from "./creatorApplications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(mapsRouter);
router.use(creatorsRouter);
router.use(submissionsRouter);
router.use(usersRouter);
router.use(notificationsRouter);
router.use(reportsRouter);
router.use(commentsRouter);
router.use(analyticsRouter);
router.use(contactRouter);
router.use(pushRouter);
router.use(storageRouter);
router.use(creatorApplicationsRouter);

export default router;
