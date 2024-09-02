import cron from "node-cron";
import { ExpressRequest } from "../server";
import { ChargeRecurring } from "../helpers/recurring.helper";

export async function RecurringCronJob(req: ExpressRequest) {
    cron.schedule("0 * * * *", async () => {
        console.log("=====================================");
        console.log("=====================================");
        console.log("=====================================");
        try {
            await ChargeRecurring(req);
        } catch (error) {
            console.error("Error in RecurringCronJob:", error);
        }
        console.log("=====================================");
        console.log("=====================================");
        console.log("=====================================");
    });
}
