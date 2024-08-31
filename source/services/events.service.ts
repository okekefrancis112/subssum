// import events from 'events';
// import { DiscordTaskJob } from './queues/producer.service';
// import { DiscordTaskConsumer } from './queues/consumer.service';

// events.EventEmitter.defaultMaxListeners = 800;

// class EventClass extends events.EventEmitter {}

// const event = new EventClass();

// const kebleEvents = () => {
//   console.log('@listening to all events');
//   event.on('discord-task-job', async (msg: string, data: any) => {
//     try {
//       console.log('===================================================================');
//       console.log(msg, data);
//       console.log('===================================================================');
//       if (!msg || !data) return Promise.reject('msg and data required');

//       let test = await DiscordTaskJob(msg, data);

//       console.log(test);
//     } catch (e: Error | string | any) {
//       console.log(e);
//     }
//   });

//   /** discord task queue consumer*/
//   event.on('discord-task-worker', async () => {
//     try {
//       console.log('===================================================================');
//       console.log('==================== working discord task job ====================');
//       console.log('===================================================================');
//       await DiscordTaskConsumer();
//     } catch (e: Error | string | any) {
//       console.log(e);
//     }
//   });
// };

// export { event, kebleEvents };
