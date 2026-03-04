# Typeracer
This tiny project goal was not studing, but having a tool like typeracer that let you type text for you to choose.  
This project was made 100% by AI - aka vibe coding project.  
## Running the project
Just for fun - you can try it youself by running
```bash
python3 -m http.server
```
and entering `http://localhost:8000/` on the url in a browser of your choice.
## How to add stories of your own
1. Create a new text file in the `/texts` directory.
2. in the `STORIES.json` file, add a new story with these fields:
    * `id` - does't really matter
    * `title` - story title
    * `author` - story author
    * `file` - refrence to the .txt file. if the file name is `macaroni.txt`, write `texts/macaroni.txt`.