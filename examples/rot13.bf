ROT13 cipher in Brainfuck
Reads input and applies ROT13 transformation
Pass input with: brainfuck run rot13.bf --input "Hello World"

-,+[
  -[>>++++[>++++++++<-]<+<-[>+>+>-[>>>]<[[>+<-]>>+>]<<<<<-]]>>>[-]+
  >--[-[<->+++[-]]]<[++++++++++++<[>-[>+>>]>[+[<+>-]>+>>]<<<<<-]>>[
  <+>-]>[-[-<<[-]>>]<<[<<->>-]>>]<<[<<+>>-]]<[-]<.[-]<
-,+]
