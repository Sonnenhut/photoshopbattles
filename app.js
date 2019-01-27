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

async function parseCommentImageUrl(commentBody) {
    const matches = commentBody.match(/(https?:\/\/i?.?imgur[a-zA-Z0-9\.\/]*)/);
    if(matches && matches[0]) {
        let res = matches[0];
        // turn .gifv (served as html) into .gif
        res = res.replace(".gifv",".gif");
        // can we turn the link into the image url somehow?!
        if(res.indexOf("i.imgur") > 0) {
            return res;
        } else {
            // parse img src from imgur html page
            return imgurImageUrl(res);
        }
    }
}

function imgurImageUrl(pageUrl) {
    // use some arbitrary proxy to avoid CORS (and having to setup a backend for this little test)
    return fetch(`https://cors-anywhere.herokuapp.com/${pageUrl}`, {
        method: "GET",
        headers: { "Origin": "www.somewhereinthe.web" }
    })
        .then(resp => resp.text())
        .then(text => {
            const matches = text.match(/image_src" href="(https:\/\/i\.imgur[a-zA-Z0-9\/\.]*)"/);
            if(matches && matches.length === 2) {
                return matches[1];
            }
        })//.then(url => console.log(url));
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

async function nextPost(after) {
    let skipName = "";
    let skip = () => { nextPost(skipName) };

    let postImg;
    let photoshopImg;
    let render = () => {
        replaceChildren('post', postImg);
        replaceChildren('photoshop', photoshopImg);
    };
    jsonp(`https://www.reddit.com/r/photoshopbattles/hot.json?limit=1&after=${after}`)
        .then((reddit) => {
            const post = reddit.data.children.filter(post => !post.data.stickied)[0].data;
            skipName = post.name;

            postImg = img(post.url);
            postImg.title = "Click -> Next post";
            postImg.onclick = () => skip();

            const commentUrl = `https://www.reddit.com${post.permalink}.json?show=all`;
            return jsonp(commentUrl);
        })
        .then(async (reddit) => {
            // second listing contains comments (first contains the post itself)
            // t1 = comment
            let comments = reddit[1].data.children.filter(entry => entry.kind === "t1").map(child => child.data);
            //const more = reddit[1].data.children.filter(entry => entry.kind === "more");

            let nextImage = async () => {
                if(comments.length === 0) {
                    skip();
                } else {
                    let comment = comments.shift();
                    const url = await parseCommentImageUrl(comment.body);
                    if(url) {
                        photoshopImg = img(url);
                        photoshopImg.title = "Click -> Next photoshop";
                        photoshopImg.onclick = nextImage;
                        render();
                    } else {
                        // skip the url if it couldn't be parsed
                        await nextImage()
                    }
                }
            };
            await nextImage();
        });
}
nextPost();