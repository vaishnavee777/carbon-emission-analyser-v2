import torch
from torch import nn

from app.ml.features import NUM_FEATURES


class EmissionNet(nn.Module):
    """Deliberately tiny MLP (~350 params): cheap to train and near-free to run."""

    def __init__(self, num_features: int = NUM_FEATURES):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(num_features, 16),
            nn.ReLU(),
            nn.Linear(16, 8),
            nn.ReLU(),
            nn.Linear(8, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.layers(x)


def count_parameters(model: nn.Module) -> int:
    return sum(p.numel() for p in model.parameters())
