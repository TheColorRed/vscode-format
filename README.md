Visual Studio Code Format will allow you to format most of your code documents.

The formatting is triggered by running your format command: `editor.action.format`

<hr>

Place your braces on the same line or the next line:

```json
{
    "newLine": {
        "brace": true
    }
}
```

Based on your settings you will see this as a result:

```
if(a == b){
    // My Code
}
```
Or you will see this as a result:
```
if(a == b)
{
    // My Code
}
```

<hr>

Place 0 or more spaces before or after a parenthesis/brace/comma for each type of keyword.

Here are just a few of the different settings:

```json
{
    "space":{
        "comma":{
            "before": 0,
            "after": 1
        },
        "parenthesis":{
            "open":{
                "before":{
                    "foreach": 1,
                    "if": 1
                }
            }
        },
        "brace":{
            "open":{
                "before":{
                    "for": 1,
                    "if": 1
                }
            }
        }
    }
}
```

Add your own space formats for a particular language:

```json
{
    "space": {
        "language": {
            "php": {
                ".": {
                    "before": 1,
                    "after": 1
                }
            }
        }
    }
}
```