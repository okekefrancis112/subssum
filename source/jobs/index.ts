import cron from "node-cron";
import { ExpressRequest } from "../server";
import { ProcessPayouts } from "../helpers/payout.helper";
import { ChargeRecurring } from "../helpers/recurring.helper";

export async function PayoutCronJob(req: ExpressRequest) {
    cron.schedule("0 * * * *", async () => {
        console.log("=====================================");
        console.log("=====================================");
        console.log("=====================================");
        try {
            await ProcessPayouts(req);
        } catch (error) {
            console.error("Error in PayoutCronJob:", error);
        }
        console.log("=====================================");
        console.log("=====================================");
        console.log("=====================================");
    });
}

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
