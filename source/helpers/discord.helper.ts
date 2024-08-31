import { env } from "../config";
import { IUserDocument } from "../interfaces/user.interface";
import { ExpressRequest } from "../server";
import { DiscordTaskJob } from "../services/queues/producer.service";

export async function discordMessageHelper(
    req: ExpressRequest,
    user: IUserDocument | null | undefined,
    info: string,
    discord_dev: string,
    discord_prod: string,
    category: string,
    data = {}
) {
    const message = `
      First Name:- ${user?.first_name || "N/A"},
      Last Name:- ${user?.last_name || "N/A"},
      Email:- ${user?.email || "N/A"},
      path:- ${req.originalUrl},
      method:- ${req.method},
      ip:- ${req.ip},
      host:- ${req.hostname},
      protocol:- ${req.protocol},
      body:- ${JSON.stringify(req.body)},
      query:- ${JSON.stringify(req.query)},
      params:- ${JSON.stringify(req.params)},
  `;

    return DiscordTaskJob({
        name: "discord",
        data: {
            title: `${info} | ${category} | ${process.env.NODE_ENV} environment`,
            message,
            channel_link: env.isDev ? discord_dev : discord_prod,
        },
    });
}
