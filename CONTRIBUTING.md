 # Contributing to a Protosmiths Project

This is a work in progress. 

I (Steve Graves) don't have strong opinions about style. For example, I used the Kernighan and Ritchie 
style for brackets for years and will use it now when that is the style of the code I am working in.  
But I think having brackets that are in matching columns makes more sense and that is the style I use 
in my own code now.  To me the important thing is making the code readable and the logic apparent.  
I believe in lots of comments.

It occurs to me that this might be the place to help give context to my programming logic. 

While not exactly style, I like the logic implied else construct.  Let's discuss it. In s function, 
one can do a number of tests for things that are needed for sucessful execution.  If a test fails one 
returns from the function with some indication of the failure.   The code after each test is an implied 
else.  The body of the function comes after the guantlet has been run.  This construct can also be used 
in loops with the continue and break operands.  The implied else reduces nesting and to my way of thinking 
makes the code easier to follow.

BTW Assertions are a formal mechanism for the implied else construct, so certain languages have given
their blessing to the construct.

.  