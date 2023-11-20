"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const discord_js_selfbot_v13_1 = require("discord.js-selfbot-v13");
const discord_video_stream_1 = require("@dank074/discord-video-stream");
const config_json_1 = tslib_1.__importDefault(require("./config.json"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const ytdl_core_1 = tslib_1.__importDefault(require("ytdl-core"));
const play_dl_1 = tslib_1.__importDefault(require("play-dl"));
const Tiktok_1 = require("./util/Tiktok");
const streamer = new discord_video_stream_1.Streamer(new discord_js_selfbot_v13_1.Client({ checkUpdate: false, }));
const tiktokVideo = new Tiktok_1.TiktokVideo();
const tiktokLive = new Tiktok_1.TiktokLive();
(0, discord_video_stream_1.setStreamOpts)(config_json_1.default.streamOpts);
const prefix = config_json_1.default.prefix;
const moviesFolder = config_json_1.default.movieFolder || './movies';
const movieFiles = fs_1.default.readdirSync(moviesFolder);
let movies = movieFiles.map(file => {
    const fileName = path_1.default.parse(file).name;
    return { name: fileName.replace(/ /g, ''), path: path_1.default.join(moviesFolder, file) };
});
console.log(`Available movies:\n${movies.map(m => m.name).join('\n')}`);
const status_idle = () => {
    return new discord_js_selfbot_v13_1.CustomStatus()
        .setState('Watching Something!')
        .setEmoji('📽');
};
const status_watch = (name) => {
    return new discord_js_selfbot_v13_1.CustomStatus()
        .setState(`Playing ${name}...`)
        .setEmoji('📽');
};
streamer.client.on("ready", () => {
    if (streamer.client.user) {
        console.log(`--- ${streamer.client.user.tag} is ready ---`);
        streamer.client.user.setActivity(status_idle());
    }
});
let streamStatus = {
    joined: false,
    joinsucc: false,
    playing: false,
    channelInfo: {
        guildId: '',
        channelId: '',
        cmdChannelId: ''
    },
    starttime: "00:00:00",
    timemark: '',
};
streamer.client.on('voiceStateUpdate', (oldState, newState) => {
    if (oldState.member?.user.id == streamer.client.user?.id) {
        if (oldState.channelId && !newState.channelId) {
            streamStatus.joined = false;
            streamStatus.joinsucc = false;
            streamStatus.playing = false;
            streamStatus.channelInfo = {
                guildId: '',
                channelId: '',
                cmdChannelId: streamStatus.channelInfo.cmdChannelId
            };
            streamer.client.user?.setActivity(status_idle());
        }
    }
    if (newState.member?.user.id == streamer.client.user?.id) {
        if (newState.channelId && !oldState.channelId) {
            streamStatus.joined = true;
            if (newState.guild.id == streamStatus.channelInfo.guildId && newState.channelId == streamStatus.channelInfo.channelId) {
                streamStatus.joinsucc = true;
            }
        }
    }
});
streamer.client.on('messageCreate', async (message) => {
    if (message.author.bot)
        return;
    if (message.author.id == streamer.client.user?.id)
        return;
    if (!config_json_1.default.commandChannel.includes(message.channel.id))
        return;
    if (!message.content.startsWith(prefix))
        return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    if (args.length == 0)
        return;
    const user_cmd = args.shift().toLowerCase();
    const [guildId, channelId] = [config_json_1.default.guildId, config_json_1.default.videoChannel];
    if (config_json_1.default.commandChannel.includes(message.channel.id)) {
        switch (user_cmd) {
            case 'play':
                if (streamStatus.joined) {
                    message.reply('Already joined');
                    return;
                }
                let moviename = args.shift();
                let movie = movies.find(m => m.name == moviename);
                if (!movie) {
                    message.reply('Movie not found');
                    return;
                }
                let startTime = args.shift() || '';
                let options = {};
                const startTimeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
                if (startTime && !startTimeRegex.test(startTime)) {
                    message.reply('Invalid start time format');
                    return;
                }
                const startTimeParts = startTime.split(':');
                let hours = 0;
                let minutes = 0;
                let seconds = 0;
                if (startTimeParts.length === 3) {
                    hours = parseInt(startTimeParts[0], 10);
                    minutes = parseInt(startTimeParts[1], 10);
                    seconds = parseInt(startTimeParts[2], 10);
                }
                if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
                    message.reply('Invalid start time');
                    return;
                }
                const startTimeSeconds = hours * 3600 + minutes * 60 + seconds;
                options['-ss'] = startTimeSeconds;
                await streamer.joinVoice(guildId, channelId);
                streamStatus.joined = true;
                streamStatus.playing = false;
                streamStatus.starttime = startTime;
                streamStatus.channelInfo = {
                    guildId: guildId,
                    channelId: channelId,
                    cmdChannelId: message.channel.id
                };
                const streamUdpConn = await streamer.createStream();
                playVideo(movie.path, streamUdpConn, options);
                message.reply('Playing ( `' + moviename + '` )...');
                console.log(message.reply('Playing ( `' + moviename + '` )...'));
                streamer.client.user?.setActivity(status_watch(moviename));
                break;
            case 'playlink':
                if (streamStatus.joined) {
                    message.reply('**Already joined**');
                    return;
                }
                let link = args.shift() || '';
                if (!link) {
                    message.reply('**Please provide a direct link/Youtube Link.**');
                    return;
                }
                let linkstartTime = args.shift() || '';
                let linkOptions = {};
                await streamer.joinVoice(guildId, channelId);
                streamStatus.joined = true;
                streamStatus.playing = false;
                streamStatus.starttime = linkstartTime;
                streamStatus.channelInfo = {
                    guildId: guildId,
                    channelId: channelId,
                    cmdChannelId: message.channel.id
                };
                const streamLinkUdpConn = await streamer.createStream();
                switch (true) {
                    case validateTiktokVideoURL(link):
                        try {
                            const videoUrl = await tiktokVideo.getVideo(link);
                            if (videoUrl) {
                                playVideo(videoUrl, streamLinkUdpConn, linkOptions);
                                message.reply('**Playing...**');
                                streamer.client.user?.setActivity(status_watch(""));
                            }
                        }
                        catch (error) {
                            message.reply('An error occurred!');
                        }
                        break;
                    case validateTiktokLiveURL(link):
                        try {
                            const liveUrl = await fetchTiktokUrl(link);
                            if (liveUrl) {
                                playVideo(liveUrl, streamLinkUdpConn, linkOptions);
                                message.reply('**Playing ' + tiktokLive.user + '\'s live **');
                                streamer.client.user?.setActivity(status_watch(""));
                            }
                        }
                        catch (error) {
                            message.reply('An error occurred!');
                        }
                        break;
                    case ytdl_core_1.default.validateURL(link):
                        const yturl = await getVideoUrl(link).catch(error => {
                            console.error("Error:", error);
                        });
                        if (yturl) {
                            message.reply('**Playing...**');
                            playVideo(yturl, streamLinkUdpConn, linkOptions);
                            streamer.client.user?.setActivity(status_watch(""));
                        }
                        break;
                    default:
                        playVideo(link, streamLinkUdpConn, linkOptions);
                        message.reply('Playing...');
                        streamer.client.user?.setActivity(status_watch(""));
                }
                break;
            case 'ytplay':
                if (streamStatus.joined) {
                    message.reply('**Already joined**');
                    return;
                }
                let title = args.length > 1 ? args.slice(1).join(' ') : args[1] || args.shift() || '';
                if (!title) {
                    message.reply('**Please provide a Youtube title!**');
                    return;
                }
                let titlestartTime = args.shift() || '';
                let titleOptions = {};
                await streamer.joinVoice(guildId, channelId);
                streamStatus.joined = true;
                streamStatus.playing = false;
                streamStatus.starttime = titlestartTime;
                streamStatus.channelInfo = {
                    guildId: guildId,
                    channelId: channelId,
                    cmdChannelId: message.channel.id
                };
                const streamYoutubeTitleUdpConn = await streamer.createStream();
                const ytUrlFromTitle = await ytPlayTitle(title);
                if (ytUrlFromTitle) {
                    message.reply('**Playing...**');
                    playVideo(ytUrlFromTitle, streamYoutubeTitleUdpConn, titleOptions);
                    streamer.client.user?.setActivity(status_watch(""));
                }
                break;
            case 'ytsearch':
                let query = args.length > 1 ? args.slice(1).join(' ') : args[1] || args.shift() || '';
                if (!query) {
                    message.reply('**Please provide a Youtube title!**');
                    return;
                }
                const ytSearchQuery = await ytSearch(query);
                try {
                    if (ytSearchQuery) {
                        message.reply(ytSearchQuery.join('\n'));
                    }
                }
                catch (error) {
                    message.reply("Error");
                }
                break;
            case 'stop':
                if (!streamStatus.joined) {
                    message.reply('**Already Stopped!**');
                    return;
                }
                streamer.leaveVoice();
                streamStatus.joined = false;
                streamStatus.joinsucc = false;
                streamStatus.playing = false;
                streamStatus.channelInfo = {
                    guildId: '',
                    channelId: '',
                    cmdChannelId: streamStatus.channelInfo.cmdChannelId
                };
                discord_video_stream_1.command?.kill("SIGKILL");
                console.log("Stopped playing");
                message.reply('**Stopped playing.**');
                break;
            case 'playtime':
                let start = streamStatus.starttime.split(':');
                let mark = streamStatus.timemark.split(':');
                let h = parseInt(start[0]) + parseInt(mark[0]);
                let m = parseInt(start[1]) + parseInt(mark[1]);
                let s = parseInt(start[2]) + parseInt(mark[2]);
                if (s >= 60) {
                    m += 1;
                    s -= 60;
                }
                if (m >= 60) {
                    h += 1;
                    m -= 60;
                }
                message.reply(`Play time: ${h}:${m}:${s}`);
                break;
            case 'pause':
                if (!streamStatus.playing) {
                    discord_video_stream_1.command?.kill("SIGSTOP");
                    message.reply('Paused');
                    streamStatus.playing = false;
                }
                else {
                    message.reply('Not playing');
                }
                break;
            case 'resume':
                if (!streamStatus.playing) {
                    discord_video_stream_1.command?.kill("SIGCONT");
                    message.reply('Resumed');
                    streamStatus.playing = true;
                }
                else {
                    message.reply('Not playing');
                }
                break;
            case 'list':
                message.reply(`Available movies:\n${movies.map(m => m.name).join('\n')}`);
                break;
            case 'status':
                message.reply(`Joined: ${streamStatus.joined}\nPlaying: ${streamStatus.playing}`);
                break;
            case 'refresh':
                const movieFiles = fs_1.default.readdirSync(moviesFolder);
                movies = movieFiles.map(file => {
                    const fileName = path_1.default.parse(file).name;
                    return { name: fileName.replace(/ /g, ''), path: path_1.default.join(moviesFolder, file) };
                });
                message.reply('Movie list refreshed ' + movies.length + ' movies found.\n' + movies.map(m => m.name).join('\n'));
                break;
            case 'help':
                const commands = {
                    play: {
                        description: 'Play a movie',
                        usage: 'play [movie name]',
                    },
                    playlink: {
                        description: 'Play a movie/video/stream direct link or from youtube/tiktok link',
                        usage: 'playlink [link]',
                    },
                    ytplay: {
                        description: 'Play a YouTube video from a title query',
                        usage: 'ytplay [query]',
                    },
                    ytsearch: {
                        description: 'Search for a YouTube video using a title query',
                        usage: 'ytsearch [query]',
                    },
                    stop: {
                        description: 'Stop the current playing movie',
                        usage: 'stop'
                    },
                    pause: {
                        description: 'Pause the currently playing movie',
                        usage: 'pause'
                    },
                    resume: {
                        description: 'Resume the paused movie',
                        usage: 'resume'
                    },
                    list: {
                        description: 'Get available movie list',
                        usage: 'list'
                    },
                    refresh: {
                        description: 'Refresh movie list.',
                        usage: 'refresh'
                    },
                    status: {
                        description: 'Get bot status.',
                        usage: 'status'
                    },
                    help: {
                        description: 'Show this help message',
                        usage: 'help'
                    }
                };
                let help = 'Available commands:\n\n';
                for (const [name, cmd] of Object.entries(commands)) {
                    help += `**${name}: ${cmd.description}**\n`;
                    help += `Usage: \`${prefix}${cmd.usage}\`\n`;
                }
                message.reply(help);
                break;
            default:
                message.reply('**Invalid command**');
        }
    }
});
streamer.client.login(config_json_1.default.token);
let lastPrint = "";
async function playVideo(video, udpConn, options) {
    console.log("Started playing video");
    udpConn.mediaConnection.setSpeaking(true);
    udpConn.mediaConnection.setVideoStatus(true);
    try {
        let videoStream = (0, discord_video_stream_1.streamLivestreamVideo)(video, udpConn, options);
        discord_video_stream_1.command?.on('progress', handleProgress);
        const res = await videoStream;
        console.log("Finished playing video");
    }
    catch (error) {
    }
    finally {
        udpConn.mediaConnection.setSpeaking(false);
        udpConn.mediaConnection.setVideoStatus(false);
        discord_video_stream_1.command?.kill("SIGKILL");
        sendFinishMessage();
        cleanupStreamStatus();
    }
}
function handleProgress(msg) {
    if (shouldPrintTimemark(msg.timemark)) {
        console.log(`Timemark: ${msg.timemark}`);
        lastPrint = msg.timemark;
    }
    streamStatus.timemark = msg.timemark;
}
function shouldPrintTimemark(timemark) {
    if (!streamStatus.timemark) {
        return true;
    }
    const last = parseTimemark(lastPrint);
    const now = parseTimemark(timemark);
    const lastSeconds = timeToSeconds(last);
    const nowSeconds = timeToSeconds(now);
    return nowSeconds - lastSeconds >= 10;
}
function parseTimemark(timemark) {
    return timemark.split(':').map(Number);
}
function timeToSeconds(time) {
    return time[2] + time[1] * 60 + time[0] * 3600;
}
function sendFinishMessage() {
    const channel = streamer.client.channels.cache.get(streamStatus.channelInfo.cmdChannelId);
    channel?.send('**Finished playing video.**');
}
function cleanupStreamStatus() {
    streamer.leaveVoice();
    streamer.client.user?.setActivity(status_idle());
    streamStatus.joined = false;
    streamStatus.joinsucc = false;
    streamStatus.playing = false;
    lastPrint = "";
    streamStatus.channelInfo = {
        guildId: '',
        channelId: '',
        cmdChannelId: ''
    };
}
async function getVideoUrl(videoUrl) {
    const video = await ytdl_core_1.default.getInfo(videoUrl);
    const videoDetails = video.videoDetails;
    if (videoDetails.isLiveContent) {
        const tsFormats = video.formats.filter(format => format.container === 'ts');
        const highestTsFormat = tsFormats.reduce((prev, current) => {
            if (!prev || current.bitrate > prev.bitrate) {
                return current;
            }
            return prev;
        });
        if (highestTsFormat) {
            return highestTsFormat.url;
        }
    }
    else {
        const videoFormats = video.formats
            .filter((format) => format.hasVideo && format.hasAudio)
            .filter(format => format.container === 'mp4');
        return videoFormats[0].url;
    }
}
async function ytPlayTitle(title) {
    try {
        const r = await play_dl_1.default.search(title, { limit: 1 });
        if (r.length > 0) {
            const video = r[0];
            const videoId = video.id;
            if (videoId) {
                const ytvideo = await ytdl_core_1.default.getInfo(videoId);
                const videoFormats = ytvideo.formats
                    .filter((format) => format.hasVideo && format.hasAudio)
                    .filter(format => format.container === 'mp4');
                return videoFormats[0].url;
            }
        }
    }
    catch (error) {
        console.log('No videos found with the given title.');
    }
}
async function ytSearch(title) {
    try {
        const r = await play_dl_1.default.search(title, { limit: 5 });
        const searchResults = [];
        if (r.length > 0) {
            r.forEach(function (video, index) {
                const result = `${index + 1}. \`${video.title}\``;
                searchResults.push(result);
            });
        }
        return searchResults;
    }
    catch (error) {
        console.log('No videos found with the given title.');
        return [];
    }
}
async function fetchTiktokUrl(url) {
    try {
        tiktokLive.url = url;
        const [user, roomId] = await tiktokLive.getRoomAndUserFromUrl();
        const liveUrl = await tiktokLive.getLiveUrl();
        return liveUrl;
    }
    catch (error) {
    }
}
function validateTiktokLiveURL(url) {
    const tiktokLiveUrlRegex = /https:\/\/(www\.)?tiktok\.com\/@([^/]+)\/live/i;
    return tiktokLiveUrlRegex.test(url);
}
function validateTiktokVideoURL(url) {
    const tiktokVideoUrlRegex = /https:\/\/(www\.)?tiktok\.com\/@[^/]+\/video\/\d+/i;
    return tiktokVideoUrlRegex.test(url);
}
if (config_json_1.default.server.enabled) {
    require('./server');
}
//# sourceMappingURL=index.js.map