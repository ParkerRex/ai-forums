# Authenticated Queries




https://www.youtube.com/watch?v=51Mzx0c6Z30
Web dev codys video - minutes 8-9



``` typescript
export const getUserPlan = query({
    args: {
        planId: v.id('plans'),
        },
    handler: async (ctx, args) => {
        const userId = (await ctx.auth.getUserIdentity())?.subject;

        if (!userId) {
        return null; 
        }

        return await getFullPlan(ctx, args.planId);
        },
}) 
```


## reddit Db

things table 
data table

everything in reddit is a thing.
- users
- links 
- comments
- subreddits 
- awards 

they keep common attributes:
- like up/down votes 
- type
- creation date 

data table: 
schema: 
thing id
key 
value

row for every attirbute. 
row for title, url, author, spam votes, etc. 


## notion db 
https://www.notion.com/blog/data-model-behind-notion
everything is a block. 

blocks have the following: 
- ID - using uuidv4 
- properties - data structure for custom attributes. eg. title, which stores the text content of the block types like paragraphs, lists and title of the page. 
- type - defines how a block is displayed, and how the glocks are interpreted. 
- content - array, or ordered set, of block id's representing the content inside the block. eg. nested bullet items in a bulletted list or the text inside a toggle. 
- parent - the block id of the blocks parent . the parent block is only used for permissions. 


### how they fit together. 
- block type: tells how the block is rendered in notion's ui. depending on type, we interpret block properties and content differently. this is what drives the `turn into` function. 

> changing a block type doesn't change the block properties or content, it changes the type it changes the type attribute. 



### let's try to break this down with an example 
given a todo list block.. lets trace thru its transformations. 

1. todo-list block created 
2. we check an item on the todo list 
3. this updates the `checked` property of the `to-do list` block. 
4. the `checked property` gets ignored when the block is transformed into `Heading` and `Callout` block types. *but* by the time we come full circle to turn it back into a `To-do list` block, it's still checked. 


> Decoupling property storage from block type allows for efficient transformation and changes to our rendering logic. It's essential for collaboration becase we preserve as much user intention as possible"

example block: 
``` json 
    "id": "e8asdj90"
    "type": "to_do",
    "properties": {
        "title": [["Write a blog post about blocks"]],
        "checked" [["no"]]
        },
    "content": [
        "00904j3",
        "09u0dj4",
        "jais309",
        ]
    "parent": "fc32e031",
    }
```




