<?php

/**
 * This script is used to get the attacks data from the Torn API, filter it and save it to a file.
 */

$url = "https://api.torn.com/v2/faction?selections=attacks";

function getURL($url)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $output = curl_exec($ch);
    curl_close($ch);
    return $output;
}

/// CHANGE THIS TO WAR START AND END TIME:
$faction_id = 51716;
$from = 1733508000;
$to = 1733669016;
$token = "";

$url .= "&from=". $from ."&to=". $to;


$attacks = [];
$len = 100;
while($len === 100) {
    if($token === "") throw new Exception("REPLACEKEYHERE");
    $url .= "&key=".$token;
    $data = getURL($url);
    $data = json_decode($data, associative: true);
    $len = sizeof($data['attacks']);
    $attacks = array_merge($attacks, $data['attacks']);
    $url = $data["_metadata"]["links"]["prev"];
}

var_dump(sizeof($attacks));

file_put_contents("attacks_unfiltered.json", json_encode($attacks, JSON_PRETTY_PRINT));



// -------- FILTER -----------
$data = file_get_contents("attacks_unfiltered.json");
$data = json_decode($data, false);

$attacks = [];
foreach ($data as $attack) {
    if($attack->is_ranked_war) $attacks[] = $attack;
}

var_dump(sizeof($attacks));

file_put_contents("attacks_war.json", json_encode($attacks, JSON_PRETTY_PRINT));


// -------- GET DEFENDS DATA -----------

$data = file_get_contents("attacks_war.json");
$data = json_decode($data, true);

$defends = [];

foreach ($data as $attack) {
    if ($attack["defender"]["faction"]["id"] === $faction_id){
        $defends[] = $attack;
    }
}

var_dump(sizeof($defends));
file_put_contents("defends_war.json", json_encode($defends, JSON_PRETTY_PRINT));




// --------- GET LOST DEFENDS DATA -----------

$data = file_get_contents("defends_war.json");
$data = json_decode($data, true);

$users = [
    "timestamp" => time(),
    "war" => "Unknown vs Unknown"
];

$factions = ["", ""];

foreach ($data as $attack) {
    if($attack["attacker"] !== null){
        $factions[0] = $attack["attacker"]["faction"]["name"];
        $factions[1] = $attack["defender"]["faction"]["name"];
    }
    $id = $attack["defender"]["name"];
    if(!array_key_exists($id, $users)){
        $users[$id] = [
            "attacked" => 0,
            "mugged" => 0,
            "hospitalised" => 0,
            "respect_they_gained" => 0
        ];
    }

    $users[$id]["respect_they_gained"] += $attack["respect_gain"];
    switch(strtolower($attack["result"])) {
        case "hospitalized":
            $users[$id]["hospitalised"]++;
            break;
        
        case "mugged":
            $users[$id]["mugged"]++;
            break;
        
        case "attacked":
            $users[$id]["attacked"]++;
            break;
    }
}
$users["war"] = $factions[0]." vs ".$factions[1];

file_put_contents("defends_lost_war.json", json_encode($users, JSON_PRETTY_PRINT));

echo "Results saved to 'defends_lost_war.json'\n";