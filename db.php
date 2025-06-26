<?php
$conn = new mysqli("localhost", "root", "", "taxi_investment");
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
