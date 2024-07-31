import { AppCommand, AppFunc, BaseSession, Card } from 'kbotify';
import sqlite3 from 'sqlite3';
import auth from '../../configs/auth';

// For DB
interface InFlightUserInterface {
  kook_id: number;
  nick_name: string;
  timestamp_start: number;
  timestamp_last_update: number;
}

interface UserActivityInterface {
  kook_id: number;
  nick_name: string;
  accumulated_time: number;
  // rewards: string
}
// ~ End of DB types

const inflightUser: Map<string, number> = new Map();
const UserActivity: Map<string, number> = new Map();

class Run extends AppCommand {
  code = 'check'; // 只是用作标记
  trigger = 'check'; // 用于触发的文字
  help = ''; // 帮助文字
  func: AppFunc<BaseSession> = async (session) => {


    await fetchDataMain();

    const card = new Card();
    card.addTitle("在线的用户");
    card.addText(processToText(inflightUser));

    card.addTitle("总计用户");
    card.addText(processToText(UserActivity));

    session.sendCard(card);
  };
}

export const run = new Run();


async function fetchData(db: sqlite3.Database): Promise<void> {
  const inflightUsersPromise = new Promise<void>((resolve, reject) => {
    db.all<InFlightUserInterface>("SELECT * from InflightUsers", (err, rows) => {
      if (err) {
        reject(`Error at fetchData from Inflight: ${err}`);
      } else {
        rows.forEach((row: InFlightUserInterface) => {
          inflightUser.set(`${row.nick_name}`, row.timestamp_last_update - row.timestamp_start);
        });
        resolve();
      }
    });
  });

  const userActivityPromise = new Promise<void>((resolve, reject) => {
    db.all<UserActivityInterface>("SELECT * from UserActivity", (err, rows) => {
      if (err) {
        reject(`Error at fetchData from UserActivity: ${err}`);
      } else {
        rows.forEach((row) => {
          UserActivity.set(`${row.nick_name}`, row.accumulated_time);
        });
        resolve();
      }
    });
  });

  await Promise.all([inflightUsersPromise, userActivityPromise]);
}

async function closeDatabase(db: sqlite3.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(`Error closing database: ${err}`);
      } else {
        resolve();
      }
    });
  });
}

async function fetchDataMain() {
  const db = new sqlite3.Database(auth.dbpath);

  try {
    await fetchData(db);
    console.log('Fetched data successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    try {
      await closeDatabase(db);
      console.log('Database connection closed.');
    } catch (err) {
      console.error(err);
    }
  }
}



function processToText(map: Map<string, number>): string {
  let res = '';
  for (const [k, v] of map) {
    res += `${k}: ${v}\n`;
  }

  return res;

}