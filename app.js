// thanks to https://github.com/ssorallen/react-reddit-client/blob/master/src/App.js
function jsonp(url) {
    let end;
    const promise = new Promise(resolve => {end = resolve});
    const cbname = `fn${Date.now()}`;
    const script = document.createElement('script');
    script.src = `${url}&jsonp=${cbname}`;

    window[cbname] = (res) => {
        // cleanup
        delete window[cbname];
        document.head.removeChild(script);

        end(res);
    };
    // start jsonp
    document.head.appendChild(script);
    return promise;
}

function parseCommentImageUrl(commentBody) {
    const matches = commentBody.match(/(https:\/\/i.imgur[a-zA-Z0-9\.\/]*)/);
    if(matches && matches[0]) {
        let res = matches[0];
        // turn .gifv (served as html) into .gif
        res = res.replace(".gifv",".gif");
        // can we turn the link into the image url somehow?!
        //return match.replace("https://imgur.com", "https://i.imgur.com");
        return res;
    }
}

function img(url) {
    const image = document.createElement('img');
    image.src = url;
    return image;
}

function replaceChildren(id, newChild) {
    const elem = document.getElementById(id);
    elem.innerHTML = "";
    elem.appendChild(newChild);
}

function nextPost(after) {
    let skipName = "";
    let skip = () => {nextPost(skipName)};

    let opImg;
    let photoshopImg;
    let render = () => {
        //let container = document.getElementById('container');
        //container.innerHTML = "";
        //container.appendChild(opImg);
        //container.appendChild(photoshopImg);
        replaceChildren('op', opImg);
        replaceChildren('photoshop', photoshopImg);
    };
    jsonp(`https://www.reddit.com/r/photoshopbattles/hot.json?limit=1&after=${after}`)
        .then((reddit) => {
            const post = reddit.data.children.filter(post => !post.data.stickied)[0].data;
            skipName = post.name;

            opImg = img(post.url);
            opImg.onclick = () => skip();

            const commentUrl = `https://www.reddit.com${post.permalink}.json?show=all`;
            return jsonp(commentUrl);
        })
        .then((reddit) => {
            console.log(reddit);
            // second listing contains comments (first contains the post itself)
            // t1 = comment
            let comments = reddit[1].data.children.filter(entry => entry.kind === "t1").map(child => child.data);
            //const more = reddit[1].data.children.filter(entry => entry.kind === "more");

            // filter posts and set the photoshop url
            comments = comments.reduce((acc, comment) => {
                const url = parseCommentImageUrl(comment.body);
                if(url) {
                    comment.photoshop = url;
                    acc.push(comment);
                }
                return acc;
            },[]);

            let nextImage = () => {
                if(comments.length === 0) {
                    skip();
                } else {
                    console.log(comments[0]);
                    photoshopImg = img(comments.shift().photoshop);
                    photoshopImg.onclick = nextImage;
                    render();
                }
            };
            nextImage();
        });
}
nextPost();