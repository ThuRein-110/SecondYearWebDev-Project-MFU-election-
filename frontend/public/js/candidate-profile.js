async function vote(){

const confirmVote = confirm("Confirm your vote for this candidate?");

if(!confirmVote) return;

const response = await fetch("/vote",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
candidate_id:7
})
});

const result = await response.json();

if(result.success){

window.location.href="vote-success.html";

}else{

alert(result.error || "Vote failed");

}

}