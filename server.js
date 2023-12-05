const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');
const methodOverride = require('method-override');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const MongoStore = require('connect-mongo');
require('dotenv').config();

app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(session({
    secret: 'soqlqjs11!', // 세션의 document id는 암호화해서 유저에게 보내준다
    resave: false, // GET/POST 요청마다 세션을 갱신할 것인지
    saveUninitialized: false, // 유저가 로그인을 안해도 세션을 만들 것인지
    cookie : { maxAge : 60 * 60 * 1000 }, // 세션 document 유효기간 변경가능 (1시간)
    // store 로그인 시 session document 발행해줌
    store : MongoStore.create({
        mongoUrl : process.env.DB_URL,
        dbName : 'forum'
    })
}));
app.use(passport.session());

// 미들웨어 연습
// 현재시간 출력
function time(요청, 응답, next) {
    console.log(new Date());
    next();
}

// 아이디, 비밀번호 빈칸이면 그러지말라고 응답하는 미들웨어
function checkBlank(요청, 응답, next) {
    if(요청.body.username == '' || 요청.body.password == '') {
        응답.send('아이디나 비밀번호 빈칸 채워.');
    }
    next();
}

let db;
const url = process.env.DB_URL;
new MongoClient(url).connect().then((client) => {
    console.log('DB연결성공');
    db = client.db('forum');
}).catch((err) => {
    console.log(err);
})

app.listen(process.env.PORT, () => {
    console.log('http://localhost:8080에서 서버 실행중');
});

function checkLogin(요청, 응답, next) {
    if(!요청.user) {
        응답.send('로그인하세요');
    }
    next();
}


// 메인페이지
app.get('/', (요청, 응답) => {
    응답.sendFile(__dirname + '/index.html');
});

// 글 작성
app.get('/write', (요청, 응답) => {
    응답.render('write.ejs');
});

// 글 작성 시 전송 버튼 클릭 시
app.post('/add', async (요청, 응답) => {
    try {
        if(요청.user == undefined) {
            응답.send('로그인 후 글 작성이 가능합니다.');
        } else {
            if (요청.body.title == '' || 요청.body.content == '') {
                응답.send('제목이나 내용을 입력하지 않았다');
            } else {
                await db.collection('post').insertOne({ title: 요청.body.title, content: 요청.body.content });
                응답.redirect('/list/1');
            }
        }
    } catch (e) {
        console.log(e);
        응답.status(500).send('서버에러남');
    }
});

// 글 리스트
app.get('/list', time, async (요청, 응답) => {
    let result = await db.collection('post').find().toArray();
    응답.render('list.ejs', { posts: result });
})

// 글 상세보기
app.get('/detail/:aaaa', async (요청, 응답) => {
    let result = await db.collection('post').findOne({ _id: new ObjectId(요청.params.aaaa) });
    try {
        if (result == null) {
            응답.status(400).send('존재하지 않는 글 입니다.');
        } else {
            console.log(요청.params);
            응답.render('detail.ejs', { result: result });
        }
    } catch (e) {
        console.log(e)
        응답.status(400).send('존재하지 않는 글번호 입니다.');
    }
})

// 글 수정
app.get('/edit/:id', async (요청, 응답) => {
    let result = await db.collection('post').findOne({ _id: new ObjectId(요청.params.id) })
    응답.render('edit.ejs', { result: result });
});

// 글 수정 버튼 클릭 시
app.put('/change', async (요청, 응답) => {
    let title = 요청.body.title;
    let content = 요청.body.content;
    let id = 요청.body.id;

    try {
        if (title == '' || content == '') {
            응답.send('수정할 제목이나 내용을 입력하세요');
        } else {
            await db.collection('post').updateOne({ _id: new ObjectId(id) }, { $set: { title: title, content: content } });
            응답.redirect('/list');
        }
    } catch (e) {
        console.log(e);
        응답.status(500).send('서버에러남');
    }
});

app.delete('/delete', async (요청, 응답) => {
    await db.collection('post').deleteOne( { _id: new ObjectId(요청.query.docid) });
    응답.send('삭제완료');
});

app.get('/time', (요청, 응답) => {
    let result = new Date();
    응답.render('time.ejs', { time: result });
});

app.get('/about', (요청, 응답) => {
    응답.sendFile(__dirname + '/about.html');
});

app.get('/news', (요청, 응답) => {
    // db.collection('post').insertOne({title: '어쩌구저쩌구'});
});

app.get('/list/:pageNum', async (요청, 응답) => {
    let result = await db.collection('post').find().skip((요청.params.pageNum - 1) * 5).limit(5).toArray();
    응답.render('list.ejs', { posts: result });
});

// 페이지 개수가 많을 경우에 사용할 수 있는 페이지네이션 방법
// 장점 : 매우 빠름, 단점 : 페이지네이션 버튼을 다음으로 변경해야함
app.get('/list/next/:pageNum', async (요청, 응답) => {
    let result = await db.collection('post').find({ _id: {$gt : new ObjectId(요청.params.pageNum) }}).limit(5).toArray();
    응답.render('list.ejs', { posts: result });
});

// 유저가 n번째 페이지를 자주 보여줘야한다면, _id를 1씩 증가하는 정수를 넣어둔다.

// 로그인 시 제출한 id, pass가 db에 있는지 확인하고 있으면 세션을 만들어줌, 유저가 입력한 아이디 비번이 db랑 비교하는 로직
// 아래 코드를 실행하고 싶으면 passport.authenticate('local')() 사용
passport.use(new LocalStrategy(async (입력한아이디, 입력한비번, cb) => {
    let result = await db.collection('user').findOne({ username : 입력한아이디 });
    if(!result) {
        return cb(null, false, { message : '아이디 DB에 없음'});
    }

    if(await bcrypt.compare(입력한비번, result.password)) {
        return cb(null, result);
    } else {
        return cb(null, false, { message : '비번불일치' });
    }
}));

passport.serializeUser((user, done) => {
    // 내부 코드를 비동기적으로 처리해줌
    process.nextTick(() => {
        done(null, { id : user._id, username : user.username });
    });
});

// 유저가 보낸 쿠키 분석을 위한 코드
passport.deserializeUser(async (user, done) => {
    let result = await db.collection('user').findOne({ _id : new ObjectId(user.id)});
    delete user.password
    process.nextTick(() => {
        // 문제점: 세션 document에 적힌 유저정보를 그대로 요청.user에 담아줌
        done(null, result);
    });
});

app.get('/login', async (요청, 응답) => {
    console.log(요청.user);
    응답.render('login.ejs');
});

app.post('/login', checkBlank, async (요청, 응답, next) => {
    // 파라미터는 error는 에러 시 뭐 들어옴, user는 성공 시 로그인한 유저정보, info는 실패 시 이유
    passport.authenticate('local', (error, user, info) => {
        if(error) return 응답.status(500).json(error);
        if(!user) return 응답.status(401).json(info.message);
        요청.logIn(user, (err) => {
            if(err) return next(err);
            응답.redirect('/');
        })
    })(요청, 응답, next);
});

// 회원가입
app.get('/register', async (요청, 응답) => {
    응답.render('register.ejs');
});

app.post('/register', checkBlank, async (요청, 응답) => {
    // hashing 하는 방법
    let 해시 = await bcrypt.hash(요청.body.password, 10);
    let result = await db.collection('user').findOne({ username : 요청.body.username });

    if(!result) {
        if(await bcrypt.compare(요청.body.password2, 해시)) {
            await db.collection('user').insertOne({ 
                username : 요청.body.username,
                password : 해시
            });
            응답.redirect('/');
        } else {
            응답.send('비밀번호가 일치하지 않습니다.');
        }
    } else {
        응답.send('이미 존재하는 아이디 입니다.');
    }
    // 나중에 예외처리 해보기
})

app.get('/mypage', async (요청, 응답) => {
    console.log(요청.user);

    if(요청.user == undefined) {
        응답.send('로그인 한 회원만 진입 가능합니다.')
    } else {
        응답.render('mypage.ejs', { username : 요청.user });
    }
});