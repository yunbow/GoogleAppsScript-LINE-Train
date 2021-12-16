/**
 * 電車遅延BOT
 * 
 * YAHOO! JAPAN 路線情報: https://transit.yahoo.co.jp/
 */
const LINE_NOTIFY_TOKEN = '*****'; // LINE NOTIFY用のアクセストークン 
const region = {
    HOKKAIDO: 2, // 北海道
    TOHOKU: 3, // 東北
    KANTO: 4, // 関東
    CHUBU: 5, // 中部
    KINKI: 6, // 近畿
    KYUSYU: 7, // 九州
    CHUGOKU: 8, // 中国
    SHIKOKU: 9, // 四国
};
const USER_REGION = region.KANTO;
const USER_LIST = [{
        name: 'A男',
        routeList: ['山手線', '野岩鉄道会津鬼怒川線'],
    },
    {
        name: 'B子',
        routeList: ['銚子電鉄線', '相鉄線']
    }
];
const WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"];

/**
 * メイン処理
 */
function main() {
    try {
        let userRouteList = [];
        for (let i in USER_LIST) {
            let user = USER_LIST[i];
            userRouteList = userRouteList.concat(user.routeList);
        }

        let troubleList = [];
        let srcHtml = getOperationInfo();
        let srcBlock = Parser.data(srcHtml).from('<div id="mdAreaMajorLine">').to('</div><!--/#mdAreaMajorLine-->').build();
        let srcItemList = Parser.data(srcBlock).from('<tr>').to('</tr>').iterate();
        for (let i in srcItemList) {
            let srcItem = srcItemList[i];
            let srcDataList = Parser.data(srcItem).from('<td>').to('</td>').iterate();
            let route = srcDataList[0].replace(/<a href=\"(.*?)\".*?>/, '').replace('</a>', '');
            let status = srcDataList[1] ? Parser.data(srcDataList[1]).from('<span class="colTrouble">').to('</span>').build() : null;
            let memo = srcDataList[2];
            if ('平常運転' != status) {
                for (let k in userRouteList) {
                    let userRoute = userRouteList[k];
                    if (route == userRoute) {
                        troubleList.push({
                            route: route,
                            status: status,
                            memo: memo
                        })
                    }
                }
            }
        }

        if (0 < troubleList.length) {
            let nowDt = new Date();
            let dt = Utilities.formatDate(nowDt, 'Asia/Tokyo', `MM/dd(${WEEKDAY[nowDt.getDay()]})`);
            let message = `\n今日の電車遅延だよ!!\n\n--- ${dt} ----\n\n`;
            for (let i in USER_LIST) {
                let user = USER_LIST[i];
                let userMessage = '';
                for (let j in user.routeList) {
                    let userRoute = user.routeList[j];
                    for (let k in troubleList) {
                        let trouble = troubleList[k];
                        if (trouble.route == userRoute) {
                            userMessage += `路線: ${trouble.route}\n`;
                            userMessage += `状況: ${trouble.status}\n`;
                            userMessage += `詳細: ${trouble.memo}\n`;
                            userMessage += `\n`;
                        }
                    }
                }
                if (0 < userMessage.length) {
                    message += `< ${user.name} >\n`;
                    message += userMessage;
                }
            }
            sendLineNotify(message);
        }

    } catch (e) {
        console.error(e.stack);
    }
}

/**
 * 運行情報を取得する
 */
function getOperationInfo() {
    let url = `https://transit.yahoo.co.jp/diainfo/area/${USER_REGION}/`;
    let options = {
        'method': 'get',
    };
    let response = UrlFetchApp.fetch(url, options);
    return response.getContentText('UTF-8');
}

/**
 * LINEにメッセージを送信する
 * @param {String} message メッセージ 
 */
function sendLineNotify(message) {
    let url = 'https://notify-api.line.me/api/notify';
    let options = {
        'method': 'post',
        'headers': {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`
        },
        'payload': `message=${message}`
    };
    let response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText('UTF-8'));
}