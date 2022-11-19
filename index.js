import youtubedl from "youtube-dl-exec";
import express from "express";
import glob from "glob";
import fs from "fs";
import { resolve } from "path";
import { Snowflake } from "@sapphire/snowflake";
import { promisify } from "util";

const globPromisify = promisify(glob);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const snowflake = new Snowflake(1668849813331);
const hour = 3.6e6;
const PORT= process.env.PORT || 3030

const app = express();
const youtubeRegex = /(youtu\.be\/|youtube\.com\/(?:(?:(?:(?:watch\?v=|embed\/)|v\/)|shorts\/)|clip\/))(?<videoId>[\w-]+)/im;

app.use(express.json());

app.get("/", async (req, res) => {
    res.status(200).json({ ping: "pong" });
});

app.post("/download", async (req, res) => {
    const data = req.body;
    if (!data.url) return res.status(400).json({ error: "Please enter a url" });
    const { url } = data;
    const path = resolve(process.cwd(), "files");
    if (!fs.existsSync(resolve(process.cwd(), "files"))) {
        fs.mkdirSync(resolve(process.cwd(), "files"));
    }

    const id = Reflect.get(youtubeRegex.exec(url).groups, "videoId");
    const filePath = resolve(path, `${snowflake.generate()}-${id}.webm`);

    const output = await youtubedl(url, {
        format: "bestaudio/best",
        output: filePath,
    });

    console.log(output);
    res.status(200).download(filePath);

    setTimeout(() => {
        if (fs.existsSync(filePath)) fs.rmSync(filePath);
    }, hour);
});

/**
 * checking if file age exceeded 1 hour
 */
setInterval(async () => {
    const now = Date.now();
    const files = await globPromisify("./files/*.webm");
    for (let file of files) {
        await wait(1000);
        const path = resolve(file);
        const name = path.split("\\").at(-1);
        const id = name.split("-").at(0);
        const timestamp = Number(snowflake.decode(id).timestamp);

        if (now - timestamp > hour) {
            fs.rmSync(path);
        }
    }
}, 10000);

app.listen(3030, () => console.log("application listening on port 3030"));
