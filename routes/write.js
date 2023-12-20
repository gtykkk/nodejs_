const router = require('express').Router();

const { ObjectId } = require('mongodb');
let connectDB = require('./../database.js')

let db;
connectDB.then((client) => {
    // console.log('DB연결성공');
    db = client.db('forum');
}).catch((err) => {
    console.log(err);
})

router.get('/write', (요청, 응답) => {
    응답.render('write.ejs');
});

router.post('/add', async (요청, 응답) => {
    console.log(요청.file);
    try {
        if (요청.user == undefined) {
            응답.send('로그인 후 글 작성이 가능합니다.');
        } else {
            if (요청.body.title == '' || 요청.body.content == '') {
                응답.send('제목이나 내용을 입력하지 않았다');
            } else {
                await db.collection('post').insertOne({
                    title: 요청.body.title,
                    content: 요청.body.content,
                    img: 요청.file ? 요청.file.location : "",
                    user: 요청.user._id,
                    username: 요청.user.username
                });
                응답.redirect('/list/1');
            }
        }
    } catch (e) {
        console.log(e);
        응답.status(500).send('서버에러남');
    }
});

router.delete('/delete', async (요청, 응답) => {
    await db.collection('post').deleteOne({ 
        _id: new ObjectId(요청.query.docid),
        user: new ObjectId(요청.user._id)
     });
    응답.send('삭제완료');
});

// 글 수정
router.get('/edit/:id', async (요청, 응답) => {
    let result = await db.collection('post').findOne({ 
        _id: new ObjectId(요청.params.id),
        user: new ObjectId(요청.user._id)
    })
    응답.render('edit.ejs', { result: result });
});

// 글 수정 버튼 클릭 시
router.put('/change', async (요청, 응답) => {
    let title = 요청.body.title;
    let content = 요청.body.content;
    let id = 요청.body.id;

    try {
        if (title == '' || content == '') {
            응답.send('수정할 제목이나 내용을 입력하세요');
        } else {
            await db.collection('post').updateOne({ _id: new ObjectId(id) }, { $set: { title: title, content: content } });
            응답.redirect('/list/1');
        }
    } catch (e) {
        console.log(e);
        응답.status(500).send('서버에러남');
    }
});

// 댓글 작성
router.post('/comment', async (요청, 응답) => {
    await db.collection('comment').insertOne({
        content : 요청.body.content,
        writerId: new ObjectId(요청.user._id),
        writer : 요청.user.username,
        parentId: new ObjectId(요청.body.parentId)
    });

    응답.redirect('back');
});
module.exports = router;