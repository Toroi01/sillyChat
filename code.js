var server = new SillyClient();
server.connect( "wss://"wss://yourserver" + ":PORT", "CHAT_NAME");
var prev_user_name = "";

var users_connected = {}
var msg_text_log = []

server.on_connect = function(){
  console.log("Connected!");
};

function generate_a_user_in_list(user)
{  
  var new_div_user = document.createElement("div");
  new_div_user.className = "user-connected";
  new_div_user.id = user.user_id;

  var new_div_user_name = document.createElement("div");
  new_div_user_name.className = "user-name";
  new_div_user_name.innerHTML = user.user_name;

  var new_img_avatar = document.createElement("img");
  new_img_avatar.src = "https://api.adorable.io/avatars/40/"+user.user_name+".png"
  new_img_avatar.className = "avatar";

  new_div_user.append(new_img_avatar);
  new_div_user.append(new_div_user_name);
  document.querySelector("#users-connected").append(new_div_user);

}

server.on_ready = function(id){
  if(prev_user_name!=""){
    server.user_name = prev_user_name;
  }
  //Add profile image
  document.getElementById("profile-image").src = "https://api.adorable.io/avatars/60/"+server.user_name+".png"
  
  //Add user at users_connected
  var user = get_user()
  users_connected[id] = user;
  generate_a_user_in_list(user);

  //Notify to the other clients that a new user is connected
  var msg = {
    status:"online",
    type:"status",
    user:user
  };
  str_msg = JSON.stringify(msg);
  server.sendMessage(str_msg);
};

server.on_user_disconnected = function( user_id ){
    //Remove user
    document.getElementById(user_id).remove();
    delete users_connected[user_id];   
}

//When we recive a msg
server.on_message = function( author_id, str_msg ){
  process_msg(str_msg);
}

function change_user_name()
{
  server.user_name = document.getElementById("input-user_name").value;
  document.getElementById("profile-image").src = "https://api.adorable.io/avatars/60/"+server.user_name+".png";

  //Update user name logs
  users_connected[server.user_id].user_name = server.user_name;
  
  //Update msg_text_log
  for(var m of msg_text_log){
    if(m.user.user_id==server.user_id)
    {
      m.user.user_name = server.user_name;
    }
  }

  var msg = {
    status:"update_info",
    type:"status",
    users_connected:users_connected,
    msg_text_log:msg_text_log
  };
  msg_str = JSON.stringify(msg);

  process_msg(msg_str);
  server.sendMessage(msg_str); 
  refresh_user_room();

}

function change_room()
{
  users_connected = {};
  msg_text_log = [];
  var new_room = document.getElementById("input-room_name").value;
  prev_user_name = (' ' + server.user_name).slice(1);
  server.connect( "wss://tamats.com" + ":55000", "JPC_"+new_room);
  document.getElementById("chat").innerHTML="";
  document.getElementById("users-connected").innerHTML="";
  
  refresh_user_room();
}

//Recive a stringify msg object and create a div
function process_msg(str_msg)
{
  msg = JSON.parse(str_msg);
  //If msg type is text
  if(msg.type == "status")
  {
    if(msg.status == "online")
    {
      users_connected[msg.user.user_id]=msg.user;
      generate_a_user_in_list(msg.user);

      //If the user is the oldest one reply with all the members
      for (user_id in users_connected){
        if(server.user_id>user_id){
          return
        }
      }
      //Reply users and msg_text_log
      var msg_reply = {
        status:"update_info",
        type:"status",
        users_connected:users_connected,
        msg_text_log:msg_text_log
      };
      str_msg_reply = JSON.stringify(msg_reply);
      server.sendMessage(str_msg_reply,[msg.user.user_id]);
    }
    if(msg.status == "update_info")
    {
      //Delete old users_connected divs and update msg and users_connected
      document.querySelector("#users-connected").innerHTML = '';
      document.querySelector("#chat").innerHTML = '';
      users_connected = msg.users_connected;
      msg_text_log = msg.msg_text_log;
      
      //Update msg
      for(var m of msg_text_log){
        generate_msg(m);
      }
      //Update users
      for(var user_id in users_connected){
        generate_a_user_in_list(users_connected[user_id]);
      }
      auto_scroll();
    }
  }

  if(msg.type == "text")
  {    
    msg_text_log.push(msg);
    generate_msg(msg);
    auto_scroll();
  }

  if(msg.type == "event")
  {
    if(msg.event=="zumbido")
    {
      shake_it();
    }

  }
}

function generate_msg(msg)
{
  //Create and a msg
  var new_div_msg = document.createElement("div");
  //If the msg is from ourself or not   
  if(msg.user.user_id == server.user_id)
  {
    new_div_msg.className="msg_div";
  }
  else{
    new_div_msg.className="msg_div_dark";
  }

  var new_img_avatar = document.createElement("img");
  new_img_avatar.src = "https://api.adorable.io/avatars/40/"+msg.user.user_name+".png"
  new_img_avatar.className = "avatar";

  var new_div_user_name = document.createElement("div");
  new_div_user_name.innerHTML = msg.user.user_name+":";
  new_div_user_name.className = "user-name";
  
  var new_span_time = document.createElement("span");
  var today = new Date();
  new_span_time.innerHTML = (today.getHours()>=10 ? today.getHours():"0"+today.getHours())  + ":" + (today.getMinutes()>=10 ?today.getMinutes():"0"+today.getMinutes());
  new_span_time.className = "time-right";

  var div_text = document.createElement("div");
  div_text.className = "msg_content";
  div_text.innerHTML = msg.text;

  new_div_msg.append(new_img_avatar);
  new_div_msg.append(new_div_user_name);
  new_div_msg.append(new_span_time);
  new_div_msg.append(div_text);

  //Add the new msg
  document.querySelector("#chat").append(new_div_msg);

}

//Create a new msg Object, send it, and add this msg to the web
function send_msg()
{
  text_msg = document.querySelector("#input_chat").value;
  if(text_msg==""){
    return
  }

  var msg = {
    text:text_msg,
    type:"text",
    user:get_user()
  };

  str_msg = JSON.stringify(msg);
  server.sendMessage(str_msg);

  process_msg(str_msg);

  //Clean input_chat
  document.querySelector("#input_chat").value = "";
}

function send_zumbido()
{
  shake_it();
  //Disable button for 2 seconds
  document.getElementById("zumbido-button").disabled = true;
  setTimeout(
    function() {
      document.getElementById("zumbido-button").disabled = false;
    }, 2000);

  var msg = {
    type:"event",
    event:"zumbido"
  };

  str_msg = JSON.stringify(msg);
  server.sendMessage(str_msg);  
}

//Press Enter to send a msg
function is_Enter(){
  if(event.key!="Enter"){
    return
  }
  else{
    send_msg()
  }
}

function get_user(){
  var user = {
    user_name:server.user_name,
    user_id:server.user_id
  };
  return user;
}

function shake_it()
{
  //Shake the chat
  prev_chat_classes = document.querySelector("#chat").className;
  document.querySelector("#chat").className += " shakeable";
  setTimeout(
    function() {
      document.querySelector("#chat").className = prev_chat_classes;
    }, 1000);


  var audio = new Audio('./zumbido.mp3');
  var playPromise = audio.play();

}


function refresh_user_room()
{ 
  setTimeout(function(){
    document.getElementById("current-user-name").innerHTML = server.user_name;
    document.getElementById("current-room-name").innerHTML = server.room.name;
  }
    ,200);
}

//Autoscroll
function auto_scroll(){
  var element = document.getElementById("chat");
  element.scrollTop = 100000000;
}






