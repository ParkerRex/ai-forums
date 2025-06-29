We need to udpate the post design to be more unified. 

This means that images with only text display the same amount inside of a preview. 

This means that if the post includes a video, that it's displayed differently than a post with only text. 

This means that a post including links should display prominently in the preivew. 

If a post has a video, imge, and text, we can show that as well. 

For instance the way that reddit posts look, we can improve on that implementation. 

Here are examples from reddit: 

Video example (autoplays, this means we need to store video uploaded to our storage bucket. We dont have one at the moment I believe.)

Users can also upload images, which means that we need to store those. 

Users can link to existing youtube videos which display differently. 


I provided UI examples below separated by the viewer experience, and the post creator experience. 

## Viewer Experience: 
Example of uploaded video: 
.cursor/plan/video-example-playing.png
.cursor/plan/video-example.png

Example of uploaded link post: 

Example of uploaded image: 
.cursor/plan/viewer-image.png
.cursor/plan/creator-images-and-videos-image-uploaded-onhover.png

Example of text only post: 
.cursor/plan/viewer-text-only.png

### Post experience: 
Example of uploaded video: 
.cursor/plan/creator-images-and-videos-empty.png
.cursor/plan/creator-images-and-videos-uploaded.png

Example of uploaded link post: 
.cursor/plan/creator-example-of-uploaded-link-post.png
.cursor/plan/creator-example-of-link-post-complete.png

Example of uploaded image: 
.cursor/plan/creator-images-and-videos-image-uploaded.png

Example of text only post: 
.cursor/plan/creator-text-only-empty.png
.cursor/plan/creator-text-only-rich-text-editor.png




