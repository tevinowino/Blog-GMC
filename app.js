var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

let uri = `mongodb+srv://tevinowino65:${process.env.MONGO_PW}@cluster0.l8t9i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
let client = new MongoClient(uri);

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', async (req, res) => {
  try {
    await client.connect();
    let db = client.db('Blogpage');
    let blogCollection = db.collection('Blogs');
    let data = await blogCollection.find({}).toArray();
    //Random number for headline
    let random = Math.floor(Math.random() * data.length);
    let headline = data[random];
    res.render('index', {
       title: 'Blog', blogs: data, headline: headline 
      });
  } catch (error) {
    console.log('Error getting data:', error);
  }
  await client.close();
});

app.get('/admin/new-blog', async (req, res) => {
  res.render('new-blog', { title: 'New Blog Post' });
});

app.get('/admin', async (req, res) => {
  try {
    await client.connect();
    let db = client.db('Blogpage');
    let blogCollection = db.collection('Blogs');
    let blogs = await blogCollection.find({}).toArray();
    res.render('admin', { title: 'Manage Blogs', blogs: blogs });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).send('Server error');
  } finally {
    await client.close();
  }
});

app.get('/admin/edit-blog/:id', async (req, res) => {
  try {
    await client.connect();
    let db = client.db('Blogpage');
    let blogCollection = db.collection('Blogs');
    let blogId = req.params.id;
    let blog = await blogCollection.findOne({ _id: new ObjectId(blogId) });
    if (!blog) {
      return res.status(404).send('Blog not found');
    }
    res.render('edit-blog', { title: 'Edit Blog', blog: blog });
  } catch (error) {
    console.error('Error fetching blog for editing:', error);
    res.status(500).send('Server error');
  } finally {
    await client.close();
  }
});

app.get('/blog/:id', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('Blogpage');
    const blogCollection = db.collection('Blogs');
    const commentCollection = db.collection('Comments');

    const blogId = req.params.id;
    const blog = await blogCollection.findOne({ _id: new ObjectId(blogId) });
    const comments = await commentCollection.find({ blogId: new ObjectId(blogId) }).toArray();

    res.render('blog-content', {
      title: blog.title,
      blog: blog,
      comments: comments
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).send('Error fetching blog.');
  } finally {
    await client.close();
  }
});
app.post('/admin/new-blog', async (req, res) => {
  try {
    await client.connect();
    let db = client.db('Blogpage');
    let blogCollection = db.collection('Blogs');
    let newBlog = {
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
      poster: req.body.poster,
      date: new Date()
    };
    if (!newBlog.title || !newBlog.content || !newBlog.author || !newBlog.poster) {
      return res.status(400).send('All fields are required');
    }
    newBlog._id = new ObjectId();
    let result = await blogCollection.insertOne(newBlog);
    res.redirect('/admin');
  } catch (error) {
    console.error('Error adding blog:', error);
    res.status(500).send('Server error');
  } finally {
    await client.close();
  }
});

app.post('/admin/delete-blog/:id', async (req, res) => {
  try {
    await client.connect();
    let db = client.db('Blogpage');
    let blogCollection = db.collection('Blogs');
    let blogId = req.params.id;
    await blogCollection.deleteOne({ _id: new ObjectId(blogId) });
    res.redirect('/admin');
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).send('Server error');
  } finally {
    await client.close();
  }
});

app.post('/admin/edit-blog/:id', async (req, res) => {
  try {
    await client.connect();
    let db = client.db('Blogpage');
    let blogCollection = db.collection('Blogs');
    let blogId = req.params.id;
    let updatedBlog = {
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
      poster: req.body.poster,
      date: new Date()
    };
    if (!updatedBlog.title || !updatedBlog.content || !updatedBlog.author || !updatedBlog.poster) {
      return res.status(400).send('All fields are required');
    }
    await blogCollection.updateOne({ _id: new ObjectId(blogId) }, { $set: updatedBlog });
    res.redirect('/admin');
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).send('Server error');
  } finally {
    await client.close();
  }
});

app.post('/blog/:id/comments', async (req, res) => {
  try {
    await client.connect();
    let db = client.db('Blogpage');
    let commentCollection = db.collection('Comments'); // Assuming comments are in a separate collection

    const { username, comment } = req.body;
    const newComment = {
      blogId: new ObjectId(req.params.id),
      username,
      content: comment,
      date: new Date(),
    };

    // Insert the new comment into the database
    await commentCollection.insertOne(newComment);

    // Redirect back to the blog page
    res.redirect(`/blog/${req.params.id}`);
  } catch (error) {
    console.error('Error posting comment:', error);
    res.status(500).send('Error posting comment.');
  } finally {
    await client.close();
  }
});

app.post('/blog/:id/like', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('Blogpage');
    const blogCollection = db.collection('Blogs');
    const blogId = req.params.id;

    await blogCollection.updateOne(
      { _id: new ObjectId(blogId) },
      { $inc: { likes: 1 } }
    );

    res.json({ success: true, message: 'Like added' });
  } catch (error) {
    console.error('Error adding like:', error);
    res.status(500).json({ success: false, message: 'Error adding like' });
  } finally {
    await client.close();
  }
});

// Dislike route
app.post('/blog/:id/dislike', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('Blogpage');
    const blogCollection = db.collection('Blogs');
    const blogId = req.params.id;

    await blogCollection.updateOne(
      { _id: new ObjectId(blogId) },
      { $inc: { dislikes: 1 } }
    );

    res.json({ success: true, message: 'Dislike added' });
  } catch (error) {
    console.error('Error adding dislike:', error);
    res.status(500).json({ success: false, message: 'Error adding dislike' });
  } finally {
    await client.close();
  }
});

app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});

module.exports = app;
