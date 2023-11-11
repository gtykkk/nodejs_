const express = require('express');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');
const methodOverride = require('method-override');

app.use(methodOverride('_method'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


let db;
const url = 'mongodb+srv://admin:qwer1234@cluster.ztm1du8.mongodb.net/?retryWrites=true&w=majority';
new MongoClient(url).connect().then((client) => {
    console.log('DB연결성공');
    db = client.db('forum');
}).catch((err) => {
    console.log(err);
})

app.listen(8080, () => {
    console.log('http://localhost:8080에서 서버 실행중');
});


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
        if (요청.body.title == '' || 요청.body.content == '') {
            응답.send('제목이나 내용을 입력하지 않았다');
        } else {
            await db.collection('post').insertOne({ title: 요청.body.title, content: 요청.body.content });
            응답.redirect('/list');
        }
    } catch (e) {
        console.log(e);
        응답.status(500).send('서버에러남');
    }
});

// 글 리스트
app.get('/list', async (요청, 응답) => {
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
    let update = await db.collection('post').findOne({ _id: new ObjectId(요청.params.id) });
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

app.get('/time', (요청, 응답) => {
    let result = new Date();
    응답.render('time.ejs', { time: result });
});

app.get('/list', async (요청, 응답) => {
    await db.collection('post').find().toArray();
});

app.get('/about', (요청, 응답) => {
    응답.sendFile(__dirname + '/about.html');
});

app.get('/news', (요청, 응답) => {
    // db.collection('post').insertOne({title: '어쩌구저쩌구'});
});
