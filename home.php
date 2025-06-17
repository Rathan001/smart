<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Urban Crop Tracker - Home</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css" rel="stylesheet" />
    <style>
        body {
            background-color: #121212;
            color: #ffffff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .navbar, .card, .footer {
            background-color: #1f1f1f;
        }
        .card img {
            max-height: 200px;
            object-fit: cover;
        }
        .section {
            padding: 60px 0;
        }
        a {
            color: #f5f5f5;
        }
        a:hover {
            color: #a0e7e5;
        }
    </style>
</head>

<body>
    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-dark">
        <div class="container">
            <a class="navbar-brand" href="#">Urban Crop Tracker</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="dashboard.php">Dashboard</a></li>
                    <li class="nav-item"><a class="nav-link" href="tasks\remainder.php">Tasks</a></li>
                    <li class="nav-item"><a class="nav-link" href="register.php">Register</a></li>
                    <li class="nav-item"><a class="nav-link" href="login.php">Login</a></li>
                </ul>
            </div>
        </div>
    </nav>

    <!-- Welcome Section -->
    <section class="text-center section" data-aos="fade-up">
        <div class="container">
            <h1 class="display-4">Welcome to Urban Crop Tracker</h1>
            <p class="lead">
                Manage your urban farm efficiently with real-time task management and crop planning tools.
            </p>
            <?php if (isset($_SESSION['user'])): ?>
                <p class="text-success">Logged in as <strong><?= $_SESSION['user'] ?></strong></p>
            <?php else: ?>
                <p class="text-warning">You are not logged in.</p>
            <?php endif; ?>
        </div>
    </section>

    <!-- Non-commercial Crops Section -->
    <section class="section bg-dark text-light" data-aos="fade-right">
        <div class="container">
            <h2 class="mb-5">Crops Suitable for Urban Areas</h2>
            <div class="row g-4">
                <div class="col-md-4">
                    <div class="card text-light" data-aos="zoom-in">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/32/Spinach_leaves.jpg" class="card-img-top" alt="Spinach">
                        <div class="card-body">
                            <h5 class="card-title">Spinach</h5>
                            <p class="card-text">Fast-growing leafy green. Grows best in cool climates and can be harvested quickly.</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-light" data-aos="zoom-in">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/8/89/Tomato_je.jpg" class="card-img-top" alt="Tomato">
                        <div class="card-body">
                            <h5 class="card-title">Tomato</h5>
                            <p class="card-text">Thrives in sunny spots with daily watering. Suitable for containers on balconies.</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card text-light" data-aos="zoom-in">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/e/e6/Coriander_leaves.jpg" class="card-img-top" alt="Coriander">
                        <div class="card-body">
                            <h5 class="card-title">Coriander</h5>
                            <p class="card-text">Best for winter seasons. Requires minimal space and moderate watering.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Goals and Features -->
    <section class="section" data-aos="fade-left">
        <div class="container">
            <h2 class="mb-4">Our Goals</h2>
            <ul>
                <li>Promote sustainable agriculture in urban settings</li>
                <li>Enable crop tracking and timely task reminders</li>
                <li>Provide a platform for easy planning and monitoring</li>
                <li>Empower users with local weather and crop guidance</li>
            </ul>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer text-center py-4 mt-5">
        <div class="container">
            <small>&copy; 2025 Urban Crop Tracker. All Rights Reserved.</small>
        </div>
    </footer>

    <script>
        AOS.init({ duration: 1200 });
    </script>
</body>
</html>
