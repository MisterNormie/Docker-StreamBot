"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TiktokLive = exports.TiktokVideo = void 0;
const tslib_1 = require("tslib");
const axios_1 = tslib_1.__importDefault(require("axios"));
const random_useragent_1 = tslib_1.__importDefault(require("random-useragent"));
class TiktokVideo {
    headers;
    constructor() {
        const userAgent = random_useragent_1.default.getRandom();
        this.headers = {
            'User-Agent': userAgent,
        };
    }
    async getVideo(url) {
        const idVideo = await this.getIdVideo(url);
        try {
            const response = await axios_1.default.get("https://api16-normal-c-useast1a.tiktokv.com/aweme/v1/feed/?aweme_id=" + idVideo, {
                headers: this.headers,
            });
            const res = response.data;
            const urlMedia = res.aweme_list[0].video.play_addr.url_list[0];
            return urlMedia;
        }
        catch (error) {
            throw new Error("Error");
        }
    }
    getIdVideo(url) {
        const matching = url.includes("/video/");
        if (!matching) {
            console.log("URL not found");
        }
        const idVideo = url.substring(url.indexOf("/video/") + 7, url.length);
        return idVideo.length > 19
            ? idVideo.substring(0, idVideo.indexOf("?"))
            : idVideo;
    }
}
exports.TiktokVideo = TiktokVideo;
class TiktokLive {
    url = '';
    user = '';
    room_id = '';
    async getRoomAndUserFromUrl() {
        try {
            const userAgent = random_useragent_1.default.getRandom();
            const response = await axios_1.default.get(this.url, {
                maxRedirects: 0,
                headers: {
                    'User-Agent': userAgent,
                }
            });
            const content = response.data;
            if (response.status === 302) {
                throw new Error('Redirect');
            }
            if (response.status === 301) {
                const regex = /com\/@(.*?)\/live/g;
                const matches = regex.exec(content);
                if (!matches || matches.length < 2) {
                    throw new Error('Live Not Found');
                }
                this.user = matches[1];
                this.room_id = await this.getRoomIdFromUser();
                return [this.user, this.room_id];
            }
            this.user = /com\/@(.*?)\/live/g.exec(content)[1];
            this.room_id = /room_id=(.*?)\"\/>/g.exec(content)[1];
            return [this.user, this.room_id];
        }
        catch (error) {
            throw error;
        }
    }
    async getRoomIdFromUser() {
        try {
            const response = await axios_1.default.get(`https://www.tiktok.com/@${this.user}/live`, { maxRedirects: 0 });
            if (response.status === 302) {
                throw new Error('Redirect');
            }
            const content = response.data;
            if (!content.includes('room_id')) {
                throw new Error('ValueError');
            }
            const room_id = /room_id=(.*?)\"\/>/g.exec(content)[1];
            return room_id;
        }
        catch (error) {
            throw error;
        }
    }
    async getLiveUrl() {
        try {
            const url = `https://webcast.tiktok.com/webcast/room/info/?aid=1988&room_id=${this.room_id}`;
            const response = await axios_1.default.get(url);
            const jsonData = response.data;
            if (jsonData && 'This account is private' in jsonData) {
                throw new Error('Account is private, login required');
            }
            const liveUrlFlv = jsonData.data.stream_url.rtmp_pull_url;
            return liveUrlFlv;
        }
        catch (error) {
            throw error;
        }
    }
}
exports.TiktokLive = TiktokLive;
//# sourceMappingURL=Tiktok.js.map